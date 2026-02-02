# Pharmacy Module API Tests
# Run with: .\test-pharmacy.ps1

$baseUrl = "http://localhost:3001/api/v1"
$results = @()

function Log-Test {
    param($name, $passed, $details = "")
    $status = if ($passed) { "✅ PASS" } else { "❌ FAIL" }
    Write-Host "$status - $name" -ForegroundColor $(if ($passed) { "Green" } else { "Red" })
    if ($details -and -not $passed) { Write-Host "   $details" -ForegroundColor Yellow }
    $script:results += @{ Name = $name; Passed = $passed; Details = $details }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   PHARMACY MODULE API TESTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ========== AUTH TESTS ==========
Write-Host "`n--- AUTHENTICATION TESTS ---" -ForegroundColor Magenta

# Test 1: Login as FARMACIA
try {
    $body = @{ email = "farmacia@vetos.com"; password = "password123" } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $body
    $token = $loginRes.data.token
    $headers = @{ Authorization = "Bearer $token" }
    Log-Test "Login as FARMACIA user" $true
} catch {
    Log-Test "Login as FARMACIA user" $false $_.Exception.Message
    Write-Host "Cannot continue without token. Exiting." -ForegroundColor Red
    exit 1
}

# Test 2: Login with wrong credentials
try {
    $body = @{ email = "farmacia@vetos.com"; password = "wrongpassword" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $body
    Log-Test "Reject invalid credentials" $false "Should have rejected"
} catch {
    Log-Test "Reject invalid credentials" $true
}

# ========== MEDICATIONS TESTS ==========
Write-Host "`n--- MEDICATIONS TESTS ---" -ForegroundColor Magenta

# Test 3: Get all medications
try {
    $meds = Invoke-RestMethod -Uri "$baseUrl/medications" -Headers $headers
    $medCount = $meds.data.medications.Count
    Log-Test "GET /medications - Returns list" ($medCount -gt 0) "Count: $medCount"
    $firstMedId = $meds.data.medications[0].id
} catch {
    Log-Test "GET /medications - Returns list" $false $_.Exception.Message
}

# Test 4: Get medications with search filter
try {
    $meds = Invoke-RestMethod -Uri "$baseUrl/medications?search=Amox" -Headers $headers
    $hasAmox = $meds.data.medications.Count -gt 0
    Log-Test "GET /medications?search=Amox - Filters correctly" $hasAmox
} catch {
    Log-Test "GET /medications?search=Amox - Filters correctly" $false $_.Exception.Message
}

# Test 5: Get medications by category
try {
    $meds = Invoke-RestMethod -Uri "$baseUrl/medications?category=ANTIBIOTICO" -Headers $headers
    $allAntibiotics = ($meds.data.medications | Where-Object { $_.category -eq "ANTIBIOTICO" }).Count
    Log-Test "GET /medications?category=ANTIBIOTICO - Filters by category" ($allAntibiotics -gt 0)
} catch {
    Log-Test "GET /medications?category=ANTIBIOTICO - Filters by category" $false $_.Exception.Message
}

# Test 6: Get single medication
try {
    $med = Invoke-RestMethod -Uri "$baseUrl/medications/$firstMedId" -Headers $headers
    Log-Test "GET /medications/:id - Returns single medication" ($med.data.medication.id -eq $firstMedId)
} catch {
    Log-Test "GET /medications/:id - Returns single medication" $false $_.Exception.Message
}

# Test 7: Get medication with invalid ID
try {
    $med = Invoke-RestMethod -Uri "$baseUrl/medications/invalid-id-12345" -Headers $headers
    Log-Test "GET /medications/:invalidId - Returns 404" $false "Should have returned 404"
} catch {
    $is404 = $_.Exception.Message -like "*404*" -or $_.Exception.Message -like "*not found*"
    Log-Test "GET /medications/:invalidId - Returns 404" $is404
}

# Test 8: Create medication
try {
    $newMed = @{
        name = "Test Medication " + (Get-Random -Maximum 9999)
        genericName = "Test Generic"
        presentation = "Tabletas"
        category = "ANTIBIOTICO"
        unit = "tableta"
        currentStock = 100
        minStock = 20
        salePrice = 25.50
    } | ConvertTo-Json
    $created = Invoke-RestMethod -Uri "$baseUrl/medications" -Method POST -Headers $headers -ContentType "application/json" -Body $newMed
    $testMedId = $created.data.medication.id
    Log-Test "POST /medications - Creates medication" ($null -ne $testMedId)
} catch {
    Log-Test "POST /medications - Creates medication" $false $_.Exception.Message
}

# Test 9: Create medication with missing required fields
try {
    $invalidMed = @{ name = "Only Name" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/medications" -Method POST -Headers $headers -ContentType "application/json" -Body $invalidMed
    Log-Test "POST /medications - Rejects missing fields" $false "Should have rejected"
} catch {
    Log-Test "POST /medications - Rejects missing fields" $true
}

# Test 10: Update medication
try {
    $update = @{ salePrice = 30.00 } | ConvertTo-Json
    $updated = Invoke-RestMethod -Uri "$baseUrl/medications/$testMedId" -Method PUT -Headers $headers -ContentType "application/json" -Body $update
    Log-Test "PUT /medications/:id - Updates medication" ($updated.data.medication.salePrice -eq 30)
} catch {
    Log-Test "PUT /medications/:id - Updates medication" $false $_.Exception.Message
}

# Test 11: Adjust stock (add)
try {
    $adjust = @{ quantity = 10; reason = "Test restock" } | ConvertTo-Json
    $adjusted = Invoke-RestMethod -Uri "$baseUrl/medications/$testMedId/adjust-stock" -Method PUT -Headers $headers -ContentType "application/json" -Body $adjust
    Log-Test "PUT /medications/:id/adjust-stock - Adds stock" ($adjusted.data.medication.currentStock -eq 110)
} catch {
    Log-Test "PUT /medications/:id/adjust-stock - Adds stock" $false $_.Exception.Message
}

# Test 12: Adjust stock (remove)
try {
    $adjust = @{ quantity = -5; reason = "Test removal" } | ConvertTo-Json
    $adjusted = Invoke-RestMethod -Uri "$baseUrl/medications/$testMedId/adjust-stock" -Method PUT -Headers $headers -ContentType "application/json" -Body $adjust
    Log-Test "PUT /medications/:id/adjust-stock - Removes stock" ($adjusted.data.medication.currentStock -eq 105)
} catch {
    Log-Test "PUT /medications/:id/adjust-stock - Removes stock" $false $_.Exception.Message
}

# Test 13: Adjust stock - reject negative result
try {
    $adjust = @{ quantity = -9999; reason = "Should fail" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/medications/$testMedId/adjust-stock" -Method PUT -Headers $headers -ContentType "application/json" -Body $adjust
    Log-Test "PUT /medications/adjust-stock - Rejects negative result" $false "Should have rejected"
} catch {
    Log-Test "PUT /medications/adjust-stock - Rejects negative result" $true
}

# ========== STOCK ALERTS TESTS ==========
Write-Host "`n--- STOCK ALERTS TESTS ---" -ForegroundColor Magenta

# Test 14: Get stock alerts
try {
    $alerts = Invoke-RestMethod -Uri "$baseUrl/medications/alerts" -Headers $headers
    Log-Test "GET /medications/alerts - Returns alerts" ($null -ne $alerts.data.alerts)
    if ($alerts.data.alerts.Count -gt 0) {
        $alertId = $alerts.data.alerts[0].id
    }
} catch {
    Log-Test "GET /medications/alerts - Returns alerts" $false $_.Exception.Message
}

# Test 15: Get low stock medications
try {
    $lowStock = Invoke-RestMethod -Uri "$baseUrl/medications/low-stock" -Headers $headers
    Log-Test "GET /medications/low-stock - Returns low stock list" ($null -ne $lowStock.data.medications)
} catch {
    Log-Test "GET /medications/low-stock - Returns low stock list" $false $_.Exception.Message
}

# Test 16: Get expiring medications
try {
    $expiring = Invoke-RestMethod -Uri "$baseUrl/medications/expiring" -Headers $headers
    Log-Test "GET /medications/expiring - Returns expiring list" ($null -ne $expiring.data.medications)
} catch {
    Log-Test "GET /medications/expiring - Returns expiring list" $false $_.Exception.Message
}

# Test 17: Check expiring medications (create alerts)
try {
    $check = Invoke-RestMethod -Uri "$baseUrl/medications/check-expiring" -Method POST -Headers $headers
    Log-Test "POST /medications/check-expiring - Creates expiring alerts" ($null -ne $check.data)
} catch {
    Log-Test "POST /medications/check-expiring - Creates expiring alerts" $false $_.Exception.Message
}

# Test 18: Resolve alert (if exists)
if ($alertId) {
    try {
        $resolve = @{ status = "RESUELTA"; resolutionNotes = "Test resolution" } | ConvertTo-Json
        $resolved = Invoke-RestMethod -Uri "$baseUrl/medications/alerts/$alertId/resolve" -Method PUT -Headers $headers -ContentType "application/json" -Body $resolve
        Log-Test "PUT /medications/alerts/:id/resolve - Resolves alert" ($resolved.data.alert.status -eq "RESUELTA")
    } catch {
        Log-Test "PUT /medications/alerts/:id/resolve - Resolves alert" $false $_.Exception.Message
    }
} else {
    Log-Test "PUT /medications/alerts/:id/resolve - Resolves alert" $true "No alerts to test (skipped)"
}

# ========== STOCK MOVEMENTS TESTS ==========
Write-Host "`n--- STOCK MOVEMENTS TESTS ---" -ForegroundColor Magenta

# Test 19: Get stock movements
try {
    $movements = Invoke-RestMethod -Uri "$baseUrl/medications/$testMedId/movements" -Headers $headers
    Log-Test "GET /medications/:id/movements - Returns movements" ($movements.data.movements.Count -ge 2) "Should have 2+ movements from tests"
} catch {
    Log-Test "GET /medications/:id/movements - Returns movements" $false $_.Exception.Message
}

# Test 20: Mark as expired
try {
    $expire = @{ quantity = 2; notes = "Test expiration" } | ConvertTo-Json
    $expired = Invoke-RestMethod -Uri "$baseUrl/medications/$testMedId/mark-expired" -Method PUT -Headers $headers -ContentType "application/json" -Body $expire
    Log-Test "PUT /medications/:id/mark-expired - Marks units expired" ($expired.data.medication.currentStock -eq 103)
} catch {
    Log-Test "PUT /medications/:id/mark-expired - Marks units expired" $false $_.Exception.Message
}

# ========== PRESCRIPTIONS TESTS ==========
Write-Host "`n--- PRESCRIPTIONS TESTS ---" -ForegroundColor Magenta

# Test 21: Get pending prescriptions
try {
    $pending = Invoke-RestMethod -Uri "$baseUrl/prescriptions/pending" -Headers $headers
    Log-Test "GET /prescriptions/pending - Returns pending list" ($null -ne $pending.data.prescriptions)
    $pendingCount = $pending.data.prescriptions.Count
    Write-Host "   Pending prescriptions: $pendingCount" -ForegroundColor Gray
    if ($pendingCount -gt 0) {
        $prescriptionId = $pending.data.prescriptions[0].id
    }
} catch {
    Log-Test "GET /prescriptions/pending - Returns pending list" $false $_.Exception.Message
}

# ========== DISPENSES TESTS ==========
Write-Host "`n--- DISPENSES TESTS ---" -ForegroundColor Magenta

# Test 22: Get dispense history
try {
    $dispenses = Invoke-RestMethod -Uri "$baseUrl/dispenses" -Headers $headers
    Log-Test "GET /dispenses - Returns dispense history" ($null -ne $dispenses.data.dispenses)
} catch {
    Log-Test "GET /dispenses - Returns dispense history" $false $_.Exception.Message
}

# Test 23: Get dispenses filtered by date
try {
    $today = Get-Date -Format "yyyy-MM-dd"
    $dispenses = Invoke-RestMethod -Uri "$baseUrl/dispenses?fecha=$today" -Headers $headers
    Log-Test "GET /dispenses?fecha - Filters by date" ($null -ne $dispenses.data.dispenses)
} catch {
    Log-Test "GET /dispenses?fecha - Filters by date" $false $_.Exception.Message
}

# ========== DASHBOARD TESTS ==========
Write-Host "`n--- DASHBOARD TESTS ---" -ForegroundColor Magenta

# Test 24: Get pharmacy dashboard stats
try {
    $stats = Invoke-RestMethod -Uri "$baseUrl/dashboard/farmacia" -Headers $headers
    Log-Test "GET /dashboard/farmacia - Returns stats" ($null -ne $stats.data)
} catch {
    Log-Test "GET /dashboard/farmacia - Returns stats" $false $_.Exception.Message
}

# ========== CLEANUP ==========
Write-Host "`n--- CLEANUP ---" -ForegroundColor Magenta

# Test 25: Delete (deactivate) test medication
try {
    $deleted = Invoke-RestMethod -Uri "$baseUrl/medications/$testMedId" -Method DELETE -Headers $headers
    Log-Test "DELETE /medications/:id - Deactivates medication" $true
} catch {
    Log-Test "DELETE /medications/:id - Deactivates medication" $false $_.Exception.Message
}

# ========== AUTHORIZATION TESTS ==========
Write-Host "`n--- AUTHORIZATION TESTS ---" -ForegroundColor Magenta

# Test 26: Access without token
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/medications" -Method GET
    Log-Test "No token - Rejects request" $false "Should have rejected"
} catch {
    Log-Test "No token - Rejects request" $true
}

# Test 27: Access with invalid token
try {
    $badHeaders = @{ Authorization = "Bearer invalid-token-here" }
    $res = Invoke-RestMethod -Uri "$baseUrl/medications" -Headers $badHeaders
    Log-Test "Invalid token - Rejects request" $false "Should have rejected"
} catch {
    Log-Test "Invalid token - Rejects request" $true
}

# Test 28: Non-FARMACIA user cannot access pharmacy endpoints
try {
    $body = @{ email = "recepcion@vetos.com"; password = "password123" } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $body
    $recepToken = $loginRes.data.token
    $recepHeaders = @{ Authorization = "Bearer $recepToken" }
    # Try to create medication (should fail)
    $newMed = @{ name = "Should Fail"; presentation = "Tab"; category = "ANTIBIOTICO"; unit = "tab"; currentStock = 10; minStock = 5; salePrice = 10 } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/medications" -Method POST -Headers $recepHeaders -ContentType "application/json" -Body $newMed
    Log-Test "Non-FARMACIA cannot create medication" $false "Should have rejected"
} catch {
    Log-Test "Non-FARMACIA cannot create medication" $true
}

# ========== SUMMARY ==========
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$passed = ($results | Where-Object { $_.Passed }).Count
$failed = ($results | Where-Object { -not $_.Passed }).Count
$total = $results.Count

Write-Host "`nTotal Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host "Success Rate: $([math]::Round(($passed / $total) * 100, 1))%" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Yellow" })

if ($failed -gt 0) {
    Write-Host "`nFailed Tests:" -ForegroundColor Red
    $results | Where-Object { -not $_.Passed } | ForEach-Object {
        Write-Host "  - $($_.Name): $($_.Details)" -ForegroundColor Red
    }
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
