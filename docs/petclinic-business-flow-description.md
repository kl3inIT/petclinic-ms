# Petclinic Business Flow Description

## Overview

The Petclinic business flow describes the complete operational process for handling a pet visit, starting from appointment booking and ending with invoice delivery to the pet owner. The workflow coordinates human tasks performed by the pet owner, receptionist, and veterinarian with automated system tasks such as visit status updates, invoice creation, payment verification, receipt storage, visit history updates, and invoice email delivery.

This process is modeled as an executable BPMN workflow named `Petclinic - Full Business Flow`. It is intended to represent the end-to-end business lifecycle of a visit in a microservices-based Petclinic system.

## Participants

- Pet Owner: Books the appointment, confirms schedule changes, and completes payment.
- Receptionist: Reviews appointment requests, modifies schedules, reviews invoices, adds optional product line items, requests payment, confirms payment, and creates receipts.
- Veterinarian: Starts the examination and records diagnosis, treatment, and visit fee.
- System: Updates visit status, creates and finalizes invoices, stores payment receipts, and updates visit history.
- SE Pay: Verifies bank transfer transactions.
- SMTP: Sends the final invoice PDF email to the pet owner.

## Main Flow

1. The process starts when the pet owner books an appointment.
2. The receptionist reviews the appointment request.
3. If the appointment is valid, the receptionist allows the visit to proceed.
4. The veterinarian starts the examination.
5. The system marks the visit status as `IN_PROGRESS`.
6. The veterinarian records the diagnosis, treatment, and visit fee.
7. The system marks the visit status as `COMPLETED`.
8. The system creates a draft invoice using the visit information and fee.
9. The receptionist reviews the draft invoice.
10. The receptionist may add optional inventory line items, such as medicine, supplies, or other products.
11. The system finalizes the invoice.
12. The receptionist requests payment from the pet owner.
13. The pet owner selects a payment method: cash or bank transfer.
14. After payment is confirmed, the receptionist creates a receipt.
15. The system saves the payment receipt.
16. The system updates the visit history.
17. The SMTP service sends the invoice PDF email to the pet owner.
18. The process ends after the invoice email has been sent.

## Schedule Modification Flow

If the receptionist decides that the appointment needs to be changed, the receptionist modifies the time slot or assigned veterinarian. The system then sends a reschedule notification to the pet owner.

The pet owner has two possible responses:

- Accept: The appointment returns to receptionist review so the updated schedule can be checked again before proceeding.
- Reject: The system cancels the visit and the process ends with the `Cancelled` outcome.

## Cancellation Flow

The visit can be cancelled in two cases:

- The receptionist decides to cancel the appointment during the initial review.
- The pet owner rejects a proposed schedule change.

In both cases, the system transitions the visit status to `CANCELLED` and the workflow ends with the `Cancelled` result.

## Invoice and Product Handling

After the visit is completed, the system creates a draft invoice based on the visit fee. The receptionist reviews the invoice before it is finalized.

At this stage, the receptionist can add inventory line items if the pet owner needs additional products, such as prescribed medicine, care supplies, or other clinic products. If no products are needed, the workflow skips this step and proceeds directly to invoice finalization.

## Payment Handling

The workflow supports two payment methods:

- Cash payment: The pet owner pays directly, and the receptionist confirms the payment.
- Bank transfer: The pet owner pays by bank transfer, SE Pay verifies the transaction, and then the receptionist confirms the payment.

After payment confirmation, the receptionist creates the receipt. The system saves the receipt, updates the visit history, and triggers the invoice email.

## Completion Criteria

The workflow is completed successfully when:

- The visit has been completed.
- The invoice has been finalized.
- The payment has been confirmed.
- The receipt has been created and saved.
- The visit history has been updated.
- The invoice PDF has been sent to the pet owner by email.

The workflow is cancelled when the appointment is rejected or cancelled before the examination proceeds.

## Key Process Variables

- `visitId`: Identifies the visit being processed.
- `ownerId`: Identifies the pet owner.
- `customerEmail`: Email address used for reschedule notifications and invoice delivery.
- `receptionDecision`: Receptionist decision for the appointment review. Expected values include `PROCEED`, `MODIFY`, and `CANCEL`.
- `customerReschedule`: Pet owner response to a reschedule request. Expected values include `ACCEPT` and `REJECT`.
- `diagnosis`: Diagnosis recorded by the veterinarian.
- `treatment`: Treatment recorded by the veterinarian.
- `fee`: Visit fee recorded by the veterinarian.
- `invoiceId`: Identifier of the invoice created for the visit.
- `addExtras`: Indicates whether additional product line items should be added to the invoice.
- `paymentMethod`: Payment method selected by the pet owner. Expected values include `CASH` and `BANK`.
- `sePayTransactionId`: Transaction identifier returned by SE Pay for bank transfer verification.
- `paymentVerified`: Indicates whether SE Pay verified the bank transfer successfully.

## Business Value

This workflow provides a single, auditable process for coordinating appointment handling, clinical work, billing, payment, receipt generation, and customer communication. It makes the responsibility of each participant explicit and separates manual business decisions from automated system actions.
