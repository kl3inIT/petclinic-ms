package com.mss301.petclinic.visits;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class VisitsServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(VisitsServiceApplication.class, args);
    }
}
