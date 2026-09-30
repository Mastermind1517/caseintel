package com.securelegal.dms.controller;

import com.securelegal.dms.model.AuditLog;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/metadata")
public class DocumentMetadataController {

    @PostMapping("/register")
    @PreAuthorize("hasAnyRole('INVESTIGATOR', 'ADMIN', 'LAWYER')")
    public ResponseEntity<?> registerDocumentInfo(@RequestBody DocumentRequest req, @AuthenticationPrincipal Jwt jwt) {
        String docId = "CASE-" + UUID.randomUUID().toString().substring(0, 8);
        
        // Log the Cognito User SUB as part of Chain of Custody
        AuditLog log = new AuditLog();
        log.setDocumentId(docId);
        log.setUserSubId(jwt.getSubject()); 
        log.setAction("REGISTER_METADATA");
        log.setTimestamp(LocalDateTime.now());
        
        return ResponseEntity.ok("{\"message\": \"Metadata secured.\", \"documentId\": \"" + docId + "\"}");
    }
}

class DocumentRequest {
    public String caseNumber;
    public String classificationLevel;
}