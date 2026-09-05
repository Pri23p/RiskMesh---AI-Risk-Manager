$ErrorActionPreference = 'Stop'

Write-Host 'Validating Docker Compose configuration...'
docker compose config --quiet

function Test-HttpEndpoint([string]$Name, [string]$Url) {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
    Write-Host ("{0}: {1} ({2})" -f $Name, $response.StatusCode, $Url)
  } catch {
    Write-Error ("{0} is unavailable at {1}. Start the service first." -f $Name, $Url)
  }
}

Test-HttpEndpoint 'Backend health' 'http://localhost:4000/health'
Test-HttpEndpoint 'ML health' 'http://localhost:8000/health'
Test-HttpEndpoint 'Frontend' 'http://localhost:5173'

Write-Host 'Stack verification passed.'
