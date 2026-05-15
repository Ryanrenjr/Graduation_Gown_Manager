$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $PSScriptRoot
$taskName = "Graduation Gown Weekly Settlement Reminder"
$npmCommandInfo = Get-Command npm.cmd -ErrorAction SilentlyContinue
$npmCommand = $null

if ($npmCommandInfo) {
  $npmCommand = $npmCommandInfo.Source
}

if (-not $npmCommand) {
  $npmCommand = (Get-Command npm -ErrorAction Stop).Source
}

$action = New-ScheduledTaskAction `
  -Execute $npmCommand `
  -Argument "run email:settlement-reminder" `
  -WorkingDirectory $projectDir

$trigger = New-ScheduledTaskTrigger `
  -Weekly `
  -DaysOfWeek Sunday `
  -At 6:00PM

$principal = New-ScheduledTaskPrincipal `
  -UserId $env:USERNAME `
  -LogonType Interactive `
  -RunLevel Limited

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Description "Email Ryan the weekly Fay settlement amount every Sunday at 6 PM." `
  -Force

Write-Host "Registered scheduled task: $taskName"
