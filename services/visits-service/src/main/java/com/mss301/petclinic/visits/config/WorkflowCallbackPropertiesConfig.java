package com.mss301.petclinic.visits.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(WorkflowCallbackProperties.class)
public class WorkflowCallbackPropertiesConfig {}
