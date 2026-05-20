package com.mss301.petclinic.reviews.service.moderation;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;

/**
 * Port từ Champlain FE `ReviewProfanity.ts`. Algorithm:
 * <ol>
 *   <li>{@link #deaccentLower(String)} — NFKD normalize, strip combining marks (é → e), lowercase</li>
 *   <li>{@link #leet(String)} — leetspeak: @→a, 0→o, 4→a, 1!→i, 3→e, 5$→s, 7→t, 8→b</li>
 *   <li>{@code flatLetters} = leet(deaccent(input)).replaceAll("[^a-z]", "")
 *       — bỏ space/punct để bắt "f u c k" hay "f.u.c.k"</li>
 *   <li>{@code boundaryText} = leet(deaccent(input))
 *       — giữ space/punct để check word boundary cho từ ngắn</li>
 *   <li><b>LONG (≥4 chars)</b>: substring match trong {@code flatLetters} → bắt được biến thể spacing</li>
 *   <li><b>SHORT (≤3 chars)</b>: word-boundary regex {@code (?<![a-z])word(?![a-z])}
 *       — tránh false positive ("ass" trong "class")</li>
 * </ol>
 *
 * <p>Word list ở {@code resources/moderation/profanity.txt} (1 từ/dòng, lowercase, # = comment).
 */
@Service
public class RegexProfanityModerator implements ContentModerator {

    private static final Logger LOG = LoggerFactory.getLogger(RegexProfanityModerator.class);
    private static final String WORD_LIST_PATH = "moderation/profanity.txt";

    private static final Pattern DIACRITIC = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    private static final Pattern NON_LETTER = Pattern.compile("[^a-z]");

    private final Set<String> longWords;   // ≥4 chars — substring match
    private final List<ShortWord> shortWords;  // ≤3 chars — word-boundary regex

    public RegexProfanityModerator() {
        Set<String> all = loadWordList();
        this.longWords = all.stream()
                .map(RegexProfanityModerator::flatWord)
                .filter(w -> w.length() >= 4)
                .collect(Collectors.toUnmodifiableSet());
        this.shortWords = all.stream()
                .map(RegexProfanityModerator::normalizeBoundaryWord)
                .filter(w -> w.length() <= 3 && !w.isEmpty())
                .map(w -> new ShortWord(w,
                        Pattern.compile("(?<![a-z])" + Pattern.quote(w) + "(?![a-z])")))
                .toList();
        LOG.info("Loaded profanity list: {} long words, {} short words",
                longWords.size(), shortWords.size());
    }

    @Override
    public ModerationResult check(String title, String comment) {
        String combined = nullSafe(title) + " " + nullSafe(comment);
        String boundaryText = leet(deaccentLower(combined));
        String flatLetters = NON_LETTER.matcher(boundaryText).replaceAll("");

        List<String> hits = new ArrayList<>();

        for (String w : longWords) {
            if (flatLetters.contains(w)) {
                hits.add(w);
            }
        }

        for (ShortWord w : shortWords) {
            if (w.pattern().matcher(boundaryText).find()) {
                hits.add(w.word());
            }
        }

        return hits.isEmpty() ? ModerationResult.clean() : ModerationResult.flagged(hits);
    }

    private static String nullSafe(String s) {
        return s == null ? "" : s;
    }

    /** NFKD normalize + strip diacritics + lowercase. "Élève" → "eleve". */
    private static String deaccentLower(String s) {
        String nfkd = Normalizer.normalize(s.toLowerCase(), Normalizer.Form.NFKD);
        return DIACRITIC.matcher(nfkd).replaceAll("");
    }

    /** Leetspeak substitution. KEEP ORDER giống FE Champlain. */
    private static String leet(String s) {
        return s.replace('@', 'a')
                .replace('0', 'o')
                .replace('4', 'a')
                .replace('1', 'i').replace('!', 'i')
                .replace('3', 'e')
                .replace('5', 's').replace('$', 's')
                .replace('7', 't')
                .replace('8', 'b');
    }

    private static String normalizeBoundaryWord(String s) {
        return leet(deaccentLower(s.trim()));
    }

    private static String flatWord(String s) {
        return NON_LETTER.matcher(normalizeBoundaryWord(s)).replaceAll("");
    }

    private record ShortWord(String word, Pattern pattern) {}

    private static Set<String> loadWordList() {
        try (InputStream in = new ClassPathResource(WORD_LIST_PATH).getInputStream()) {
            String text = StreamUtils.copyToString(in, StandardCharsets.UTF_8);
            return text.lines()
                    .map(String::trim)
                    .filter(line -> !line.isEmpty() && !line.startsWith("#"))
                    .map(String::toLowerCase)
                    .collect(Collectors.toUnmodifiableSet());
        } catch (IOException e) {
            LOG.warn("Không load được {} — moderation effectively disabled", WORD_LIST_PATH, e);
            return Set.of();
        }
    }
}
