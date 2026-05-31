package com.mss301.petclinic.workflow;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class WorkflowServiceApplicationTests {

    @Test
    void contextLoads() {
        // Camunda 8 client is disabled in test; verifies web/security/workers context wiring.
    }
}
