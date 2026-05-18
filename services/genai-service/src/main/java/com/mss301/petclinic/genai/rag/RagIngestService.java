package com.mss301.petclinic.genai.rag;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.TextReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Ingest knowledge base markdown vào VectorStore lúc startup.
 *
 * <p>Idempotent: probe SearchRequest với topK=1 — nếu có ≥1 row, skip. Tránh re-ingest
 * tốn embedding token mỗi lần restart.
 *
 * <p>Conditional: chỉ chạy khi {@link VectorStore} bean tồn tại (= EmbeddingConfig đã active
 * → PgVectorStore autoconfig đã tạo bean). Empty embedding key → skip toàn bộ flow.
 *
 * <p>WebFlux migration: dùng {@link ApplicationReadyEvent} thay {@code @PostConstruct} —
 * embedding API call là blocking I/O, không nên chạy trong bean init (block startup +
 * potential event-loop pin nếu được trigger từ reactive context).
 */
@Service
@ConditionalOnBean(VectorStore.class)
public class RagIngestService {

    private static final Logger log = LoggerFactory.getLogger(RagIngestService.class);

    private final VectorStore vectorStore;
    private final Resource faqResource;

    public RagIngestService(VectorStore vectorStore,
                             @Value("classpath:/data/pet-care-faq.md") Resource faqResource) {
        this.vectorStore = vectorStore;
        this.faqResource = faqResource;
    }

    @EventListener(ApplicationReadyEvent.class)
    void ingestOnStartup() {
        if (!vectorStoreEmpty()) {
            log.info("VectorStore already populated — skip FAQ ingest");
            return;
        }
        log.info("Ingesting pet-care-faq.md into VectorStore");

        TextReader reader = new TextReader(faqResource);
        reader.getCustomMetadata().put("source", "pet-care-faq.md");
        reader.getCustomMetadata().put("category", "knowledge-base");

        List<Document> documents = reader.get();
        // Token splitter: ~512 token chunks với 50 token overlap. Markdown headers giữ ngữ cảnh.
        TokenTextSplitter splitter = TokenTextSplitter.builder()
                .withChunkSize(512)
                .withMinChunkSizeChars(350)
                .withMinChunkLengthToEmbed(5)
                .withMaxNumChunks(10000)
                .withKeepSeparator(true)
                .build();
        List<Document> chunks = splitter.apply(documents);

        vectorStore.add(chunks);
        log.info("Ingested {} chunks from FAQ into VectorStore", chunks.size());
    }

    private boolean vectorStoreEmpty() {
        try {
            // Probe với query trống + topK=1. Nếu có result → store có data.
            List<Document> sample = vectorStore.similaritySearch(
                    SearchRequest.builder().query("probe").topK(1).build());
            return sample == null || sample.isEmpty();
        } catch (Exception e) {
            log.warn("VectorStore empty check failed — assume empty, will ingest", e);
            return true;
        }
    }
}
