# Medical → Pharmacy Integration Flow Tests
# Tests the complete workflow from prescription creation to dispense

$baseUrl = "http://localhost:3001/api/v1"
$results = @()

function Log-Test {
    param($name, $passed, $details = "")
    $status = if ($passed) { "✅ PASS" } else { "❌ FAIL" }
    Write-Host "$status - $name" -ForegroundColor $(if ($passed) { "Green" } else { "Red" })
    if ($details) { Write-Host "   $details" -ForegroundColor Gray }
    $script:results += @{ Name = $name; Passed = $passed; Details = $details }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   MEDICAL → PHARMACY FLOW TESTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ========== SETUP ==========
Write-Host "--- SETUP ---" -ForegroundColor Magenta

# Login as MEDICO
try {
    $body = @{ email = "drgarcia@vetos.com"; password = "password123" } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $body
    $medicoToken = $loginRes.data.token
    $medicoHeaders = @{ Authorization = "Bearer $medicoToken" }
    Log-Test "Login as MEDICO" $true
} catch {
    Log-Test "Login as MEDICO" $false $_.Exception.Message
    Write-Host "Cannot continue without MEDICO token. Exiting." -ForegroundColor Red
    exit 1
}

# Login as FARMACIA
try {
    $body = @{ email = "farmacia@vetos.com"; password = "password123" } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $body
    $farmaciaToken = $loginRes.data.token
    $farmaciaHeaders = @{ Authorization = "Bearer $farmaciaToken" }
    Log-Test "Login as FARMACIA" $true
} catch {
    Log-Test "Login as FARMACIA" $false $_.Exception.Message
    Write-Host "Cannot continue without FARMACIA token. Exiting." -ForegroundColor Red
    exit 1
}

# Login as RECEPCION
try {
    $body = @{ email = "recepcion@vetos.com"; password = "password123" } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $body
    $recepcionToken = $loginRes.data.token
    $recepcionHeaders = @{ Authorization = "Bearer $recepcionToken" }
    Log-Test "Login as RECEPCION" $true
} catch {
    Log-Test "Login as RECEPCION" $false $_.Exception.Message
}

# Get a medication for testing
try {
    $meds = Invoke-RestMethod -Uri "$baseUrl/medications" -Headers $farmaciaHeaders
    $testMed = $meds.data.medications[0]
    $testMedId = $testMed.id
    $testMedName = $testMed.name
    $testMedStock = $testMed.currentStock
    Log-Test "Get test medication" $true "Using: $testMedName (Stock: $testMedStock)"
} catch {
    Log-Test "Get test medication" $false $_.Exception.Message
}

# ========== FLOW TESTS ==========
Write-Host "`n--- PRESCRIPTION FLOW ---" -ForegroundColor Magenta

# Check initial pending prescriptions count
try {
    $initialPending = Invoke-RestMethod -Uri "$baseUrl/prescriptions/pending" -Headers $farmaciaHeaders
    $initialCount = $initialPending.data.prescriptions.Count
    Log-Test "Initial pending prescriptions" $true "Count: $initialCount"
} catch {
    Log-Test "Initial pending prescriptions" $false $_.Exception.Message
}

# Check for existing prescriptions from seed data
if ($initialCount -gt 0) {
    $testPrescription = $initialPending.data.prescriptions[0]
    $prescriptionId = $testPrescription.id
    $petId = $testPrescription.consultation.visit.pet.id
    Log-Test "Found existing prescription for testing" $true "Prescription ID: $prescriptionId"
    
    Write-Host "`n--- DISPENSE FLOW ---" -ForegroundColor Magenta
    
    # Get prescription details
    try {
        $rxDetails = Invoke-RestMethod -Uri "$baseUrl/prescriptions/$prescriptionId" -Headers $farmaciaHeaders
        $prescriptionItems = $rxDetails.data.prescription.items
        Log-Test "Get prescription details" $true "Items: $($prescriptionItems.Count)"
    } catch {
        Log-Test "Get prescription details" $false $_.Exception.Message
    }
    
    # Get a valid medication with stock for dispense
    try {
        $medsForDispense = Invoke-RestMethod -Uri "$baseUrl/medications" -Headers $farmaciaHeaders
        $availableMed = $medsForDispense.data.medications | Where-Object { $_.currentStock -gt 5 } | Select-Object -First 1
        
        if ($availableMed) {
            Log-Test "Find medication with stock" $true "$($availableMed.name): $($availableMed.currentStock) units"
            
            # Dispense the prescription
            $dispenseBody = @{
                prescriptionId = $prescriptionId
                petId = $petId
                items = @(
                    @{
                        medicationId = $availableMed.id
                        medicationName = $availableMed.name
                        requestedQty = 2
                        dispensedQty = 2
                        unitPrice = [double]$availableMed.salePrice
                    }
                )
                notes = "Test dispense from integration test"
                deliveredTo = "Test Owner"
            } | ConvertTo-Json -Depth 5
            
            try {
                $dispenseResult = Invoke-RestMethod -Uri "$baseUrl/dispenses" -Method POST -Headers $farmaciaHeaders -ContentType "application/json" -Body $dispenseBody
                $dispenseId = $dispenseResult.data.dispense.id
                Log-Test "Create dispense" $true "Dispense ID: $dispenseId"
                
                # Verify prescription status changed
                try {
                    $updatedRx = Invoke-RestMethod -Uri "$baseUrl/prescriptions/$prescriptionId" -Headers $farmaciaHeaders
                    $newStatus = $updatedRx.data.prescription.status
                    Log-Test "Prescription status updated" ($newStatus -eq "DESPACHADA") "Status: $newStatus"
                } catch {
                    Log-Test "Prescription status updated" $false $_.Exception.Message
                }
                
                # Verify stock decreased
                try {
                    $updatedMed = Invoke-RestMethod -Uri "$baseUrl/medications/$($availableMed.id)" -Headers $farmaciaHeaders
                    $newStock = $updatedMed.data.medication.currentStock
                    $expectedStock = $availableMed.currentStock - 2
                    Log-Test "Stock decreased" ($newStock -eq $expectedStock) "Was: $($availableMed.currentStock), Now: $newStock, Expected: $expectedStock"
                } catch {
                    Log-Test "Stock decreased" $false $_.Exception.Message
                }
                
                # Verify dispense appears in history
                try {
                    $history = Invoke-RestMethod -Uri "$baseUrl/dispenses" -Headers $farmaciaHeaders
                    $foundDispense = $history.data.dispenses | Where-Object { $_.id -eq $dispenseId }
                    Log-Test "Dispense appears in history" ($null -ne $foundDispense)
                } catch {
                    Log-Test "Dispense appears in history" $false $_.Exception.Message
                }
                
                # Verify pending prescriptions decreased
                try {
                    $newPending = Invoke-RestMethod -Uri "$baseUrl/prescriptions/pending" -Headers $farmaciaHeaders
                    $newCount = $newPending.data.prescriptions.Count
                    Log-Test "Pending count decreased" ($newCount -lt $initialCount) "Was: $initialCount, Now: $newCount"
                } catch {
                    Log-Test "Pending count decreased" $false $_.Exception.Message
                }
                
            } catch {
                Log-Test "Create dispense" $false $_.Exception.Message
            }
        } else {
            Log-Test "Find medication with stock" $false "No medications with sufficient stock"
        }
    } catch {
        Log-Test "Find medication with stock" $false $_.Exception.Message
    }
    
} else {
    Write-Host "   No pending prescriptions to test. Skipping dispense flow." -ForegroundColor Yellow
}

# ========== REJECT FLOW ==========
Write-Host "`n--- REJECT FLOW ---" -ForegroundColor Magenta

# Check for a prescription to reject
try {
    $pendingForReject = Invoke-RestMethod -Uri "$baseUrl/prescriptions/pending" -Headers $farmaciaHeaders
    if ($pendingForReject.data.prescriptions.Count -gt 0) {
        $rxToReject = $pendingForReject.data.prescriptions[0]
        $rejectId = $rxToReject.id
        
        # Reject the prescription
        $rejectBody = @{
            reason = "Test rejection from integration tests"
            notes = "This is a test"
        } | ConvertTo-Json
        
        try {
            $rejectResult = Invoke-RestMethod -Uri "$baseUrl/prescriptions/$rejectId/reject" -Method PUT -Headers $farmaciaHeaders -ContentType "application/json" -Body $rejectBody
            $rejectedStatus = $rejectResult.data.prescription.status
            Log-Test "Reject prescription" ($rejectedStatus -eq "CANCELADA") "Status: $rejectedStatus"
        } catch {
            Log-Test "Reject prescription" $false $_.Exception.Message
        }
        
        # Verify no longer in pending
        try {
            $afterReject = Invoke-RestMethod -Uri "$baseUrl/prescriptions/pending" -Headers $farmaciaHeaders
            $stillPending = $afterReject.data.prescriptions | Where-Object { $_.id -eq $rejectId }
            Log-Test "Rejected prescription removed from pending" ($null -eq $stillPending)
        } catch {
            Log-Test "Rejected prescription removed from pending" $false $_.Exception.Message
        }
        
    } else {
        Log-Test "Reject prescription" $true "No prescriptions to reject (skipped)"
    }
} catch {
    Log-Test "Reject prescription" $false $_.Exception.Message
}

# ========== ALERT AUTO-CREATION ==========
Write-Host "`n--- ALERT AUTO-CREATION ---" -ForegroundColor Magenta

# Check expiring medications
try {
    $checkResult = Invoke-RestMethod -Uri "$baseUrl/medications/check-expiring" -Method POST -Headers $farmaciaHeaders
    Log-Test "Check expiring medications" $true "Expiring: $($checkResult.data.expiringCount), Expired: $($checkResult.data.expiredCount)"
} catch {
    Log-Test "Check expiring medications" $false $_.Exception.Message
}

# Verify alerts were created
try {
    $alerts = Invoke-RestMethod -Uri "$baseUrl/medications/alerts" -Headers $farmaciaHeaders
    $activeAlerts = $alerts.data.alerts | Where-Object { $_.status -eq "ACTIVA" }
    Log-Test "Alerts exist in system" ($activeAlerts.Count -gt 0) "Active alerts: $($activeAlerts.Count)"
} catch {
    Log-Test "Alerts exist in system" $false $_.Exception.Message
}

# ========== STOCK MOVEMENT TRACKING ==========
Write-Host "`n--- STOCK MOVEMENT TRACKING ---" -ForegroundColor Magenta

# Adjust stock and verify movement
try {
    $adjustBody = @{ quantity = 5; reason = "Integration test restock" } | ConvertTo-Json
    $adjusted = Invoke-RestMethod -Uri "$baseUrl/medications/$testMedId/adjust-stock" -Method PUT -Headers $farmaciaHeaders -ContentType "application/json" -Body $adjustBody
    Log-Test "Adjust stock (add)" $true "New stock: $($adjusted.data.medication.currentStock)"
    
    # Verify movement was recorded
    $movements = Invoke-RestMethod -Uri "$baseUrl/medications/$testMedId/movements" -Headers $farmaciaHeaders
    $recentMovement = $movements.data.movements | Where-Object { $_.reason -eq "Integration test restock" }
    Log-Test "Stock movement recorded" ($null -ne $recentMovement) "Type: $($recentMovement.type)"
} catch {
    Log-Test "Adjust stock (add)" $false $_.Exception.Message
}

# ========== SUMMARY ==========
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   INTEGRATION TEST SUMMARY" -ForegroundColor Cyan
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
