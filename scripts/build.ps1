$env:GOTOOLCHAIN="local"
$version = git describe --tags --always --dirty
$buildTime = Get-Date -Format "yyyy-MM-dd_HH:mm:ss"
$gitCommit = git rev-parse HEAD
$goVersion = (go version).Split(' ')[2]

$ldflags = "-H windowsgui -s -w -X main.version=$version -X main.buildTime=$buildTime -X main.gitCommit=$gitCommit -X main.goVersion=$goVersion"

Write-Host "Building with version: $version"
Write-Host "Build time: $buildTime"
Write-Host "Git commit: $gitCommit"
Write-Host "Go version: $goVersion"

go build -ldflags $ldflags -o bin\ojivid.exe main.go 