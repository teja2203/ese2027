@rem Gradle startup script for Windows
@if "%DEBUG%"=="" @echo off
set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
set GRADLE_USER_HOME=%DIRNAME%.gradle
if "%JAVA_HOME%"=="" if exist "%USERPROFILE%\.jdks\ms-17.0.20\bin\java.exe" set "JAVA_HOME=%USERPROFILE%\.jdks\ms-17.0.20"
if "%JAVA_HOME%"=="" if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
if not exist "%JAVA_HOME%\bin\java.exe" (
  echo ERROR: JDK 17 is required. Set JAVA_HOME to a JDK 17 installation.
  exit /b 1
)
"%JAVA_HOME%\bin\java.exe" -cp "%DIRNAME%\gradle\wrapper\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain %*
