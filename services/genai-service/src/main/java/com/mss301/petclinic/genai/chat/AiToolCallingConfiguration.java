package com.mss301.petclinic.genai.chat;

import io.micrometer.observation.ObservationRegistry;

import org.springframework.ai.model.tool.ToolCallingManager;
import org.springframework.ai.tool.execution.ToolExecutionExceptionProcessor;
import org.springframework.ai.tool.resolution.ToolCallbackResolver;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import tools.jackson.databind.ObjectMapper;

/** Replaces Spring AI's default manager with an equivalent manager that emits UI tool events. */
@Configuration(proxyBeanMethods = false)
class AiToolCallingConfiguration {

    @Bean
    ToolCallingManager toolCallingManager(ToolCallbackResolver resolver,
            ToolExecutionExceptionProcessor exceptionProcessor,
            ObjectProvider<ObservationRegistry> observationRegistry,
            ObjectMapper json) {
        ToolCallingManager delegate = ToolCallingManager.builder()
                .observationRegistry(observationRegistry.getIfUnique(() -> ObservationRegistry.NOOP))
                .toolCallbackResolver(resolver)
                .toolExecutionExceptionProcessor(exceptionProcessor)
                .build();
        return new EventEmittingToolManager(delegate, json);
    }
}
