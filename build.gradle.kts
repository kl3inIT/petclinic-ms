// Root build script — KHÔNG có code, KHÔNG apply plugin nào trực tiếp.
// Mọi convention chuyển sang build-logic/.
// File này gần như rỗng — đó là mục đích.

group = "com.mss301.petclinic"
version = "0.0.1-SNAPSHOT"

// Task tiện ích: ./gradlew clean ở root sẽ clean tất cả subproject.
tasks.register<Delete>("cleanAll") {
    group = "build"
    description = "Delete build directories of root and all subprojects."
    delete(rootProject.layout.buildDirectory)
    subprojects.forEach { delete(it.layout.buildDirectory) }
}
