package com.mss301.petclinic.buildlogic

import io.spring.gradle.dependencymanagement.dsl.DependencyManagementExtension
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.configure

class SharedLibraryPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        with(project) {
        pluginManager.apply("petclinic.java-conventions")
        pluginManager.apply("java-library")
        pluginManager.apply("io.spring.dependency-management")

        extensions.configure<DependencyManagementExtension> {
            imports {
                mavenBom("org.springframework.boot:spring-boot-dependencies:${libs.requiredVersion("springBoot")}")
            }
        }
        }
    }
}
