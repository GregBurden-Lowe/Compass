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

