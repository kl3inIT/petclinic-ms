package com.mss301.petclinic.buildlogic

import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.plugins.JavaPluginExtension
import org.gradle.api.tasks.testing.Test
import org.gradle.api.tasks.compile.JavaCompile
import org.gradle.jvm.toolchain.JavaLanguageVersion
import org.gradle.kotlin.dsl.configure
import org.gradle.kotlin.dsl.dependencies
import org.gradle.kotlin.dsl.named
import org.gradle.kotlin.dsl.withType
import org.gradle.testing.jacoco.tasks.JacocoReport

class JavaConventionsPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        with(project) {
        pluginManager.apply("java")
        pluginManager.apply("jacoco")

        group = "com.mss301.petclinic"
        version = "0.0.1-SNAPSHOT"

        extensions.configure<JavaPluginExtension> {
            toolchain {
                languageVersion.set(JavaLanguageVersion.of(libs.requiredVersion("java").toInt()))
            }
        }

        tasks.withType<JavaCompile>().configureEach {
            options.encoding = "UTF-8"
            options.compilerArgs.addAll(
                listOf(
                    "-parameters",
                    "-Xlint:all,-processing",
                )
            )
        }

        dependencies {
            add("testImplementation", platform(libs.library("junit-bom")))
            add("testImplementation", libs.library("junit-jupiter"))
            add("testRuntimeOnly", libs.library("junit-platform-launcher"))
        }

        tasks.withType<Test>().configureEach {
            useJUnitPlatform()
            testLogging {
                events("passed", "skipped", "failed")
            }
            finalizedBy(tasks.named("jacocoTestReport"))
        }

        tasks.named<JacocoReport>("jacocoTestReport") {
            dependsOn(tasks.named("test"))
            reports {
                xml.required.set(true)
                html.required.set(true)
            }
        }
        }
    }
}
