package com.mss301.petclinic.vets;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class VetsServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(VetsServiceApplication.class, args);
    }
}
