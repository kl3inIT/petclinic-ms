package com.mss301.petclinic.buildlogic

import io.spring.gradle.dependencymanagement.dsl.DependencyManagementExtension
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.configure
import org.gradle.kotlin.dsl.dependencies
import org.gradle.kotlin.dsl.named
import org.springframework.boot.gradle.dsl.SpringBootExtension
import org.springframework.boot.gradle.tasks.run.BootRun

class SpringBootServicePlugin : Plugin<Project> {
    override fun apply(project: Project) {
        with(project) {
        pluginManager.apply("petclinic.java-conventions")
        pluginManager.apply("org.springframework.boot")
        pluginManager.apply("io.spring.dependency-management")

        extensions.configure<DependencyManagementExtension> {
            imports {
                mavenBom("org.springframework.cloud:spring-cloud-dependencies:${libs.requiredVersion("springCloud")}")
            }
        }

        extensions.configure<SpringBootExtension> {
            buildInfo {
                properties {
                    additional.set(
                        mapOf(
                            "service" to project.name,
                        )
                    )
                }
            }
        }

        tasks.named<BootRun>("bootRun") {
            workingDir = rootDir
        }

        dependencies {
            add("implementation", libs.library("spring-boot-starter-actuator"))
        }
        }
    }
}
