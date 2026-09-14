plugins { java }
group = "dev.worldagent"
version = "0.1.0"
repositories { mavenCentral(); maven("https://repo.papermc.io/repository/maven-public/") }
dependencies {
    compileOnly("io.papermc.paper:paper-api:26.2.build.123-stable")
    compileOnly(files("../../server-dev/plugins/worldedit-bukkit-7.4.5.jar"))
    compileOnly("com.google.code.gson:gson:2.14.0")
}
java { toolchain.languageVersion.set(JavaLanguageVersion.of(25)) }
dependencyLocking { lockAllConfigurations() }
tasks.withType<JavaCompile>().configureEach { options.encoding = "UTF-8" }
tasks.jar { archiveFileName.set("world-agent-0.1.0.jar") }
