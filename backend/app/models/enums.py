from enum import Enum


class UserRole(str, Enum):
    admin = "admin"
    complaints_handler = "complaints_handler"
    complaints_manager = "complaints_manager"
    reviewer = "reviewer"
    read_only = "read_only"


class ComplaintStatus(str, Enum):
    new = "new"
    acknowledged = "acknowledged"
    in_investigation = "in_investigation"
    response_drafted = "response_drafted"
    final_response_issued = "final_response_issued"
    closed = "closed"
    reopened = "reopened"


class CommunicationDirection(str, Enum):
    inbound = "inbound"
    outbound = "outbound"


class CommunicationChannel(str, Enum):
    phone = "phone"
    email = "email"
    letter = "letter"
    web = "web"
    third_party = "third_party"
    other = "other"


class OutcomeType(str, Enum):
    upheld = "upheld"
    partially_upheld = "partially_upheld"
    not_upheld = "not_upheld"
    withdrawn = "withdrawn"
    out_of_scope = "out_of_scope"


class TaskStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    completed = "completed"


class RedressPaymentStatus(str, Enum):
    pending = "pending"
    authorised = "authorised"
    paid = "paid"


class RedressType(str, Enum):
    financial_loss = "financial_loss"
    interest = "interest_on_financial_loss"
    distress = "distress_and_inconvenience"
    consequential_loss = "consequential_loss"
    premium_refund = "premium_refund_adjustment"
    goodwill = "goodwill_payment"
    third_party = "third_party_payment"
    apology = "apology_or_explanation"
    remedial_action = "remedial_action"


class ActionStatus(str, Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"


# Root cause taxonomy — plain strings validated at the schema layer (not a DB enum)
# so the list can grow without any DDL changes.
ROOT_CAUSE_CATEGORIES: dict[str, list[str]] = {
    "Communication & Service": [
        "delay_in_response",
        "unclear_communication",
        "staff_conduct",
        "failure_to_update_customer",
        "inaccessible_service",
    ],
    "Claims Handling": [
        "incorrectly_declined",
        "settlement_undervalued",
        "delay_in_handling",
        "incorrect_exclusion_applied",
        "excessive_information_requests",
    ],
    "Policy Administration": [
        "incorrect_documentation",
        "incorrect_premium",
        "policy_set_up_incorrectly",
        "renewal_error",
        "cancellation_lapse_error",
    ],
    "Sales & Distribution": [
        "unsuitable_product",
        "incorrect_information_at_sale",
        "failure_to_disclose_terms",
        "needs_not_assessed",
    ],
    "Underwriting & Risk": [
        "incorrect_risk_assessment",
        "incorrect_loading_or_exclusion",
        "unjustified_decline",
    ],
    "Systems & Process": [
        "system_it_failure",
        "process_gap",
        "data_document_error",
    ],
    "Third Party": [
        "broker_intermediary_error",
        "third_party_supplier_failure",
    ],
    "Vulnerability & Accessibility": [
        "failure_to_identify_vulnerability",
        "failure_to_adapt_service",
        "accessibility_barrier",
    ],
    "Other": [
        "other",
    ],
}

VALID_ROOT_CAUSES: frozenset[str] = frozenset(
    cause
    for causes in ROOT_CAUSE_CATEGORIES.values()
    for cause in causes
)

