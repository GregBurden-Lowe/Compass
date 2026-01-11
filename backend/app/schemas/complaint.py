from datetime import datetime, date
from uuid import UUID
from typing import List, Optional
from pydantic import BaseModel, Field

from app.models.enums import (
    ComplaintStatus,
    CommunicationChannel,
    CommunicationDirection,
    TaskStatus,
    OutcomeType,
    RedressPaymentStatus,
    RedressType,
    ActionStatus,
)


class ComplainantBase(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[date] = None
    preferred_contact_method: Optional[str] = None


class ComplainantCreate(ComplainantBase):
    pass


class ComplainantOut(ComplainantBase):
    id: UUID

    class Config:
        orm_mode = True


class PolicyBase(BaseModel):
    policy_number: Optional[str] = None
    insurer: Optional[str] = None
    broker: Optional[str] = None
    product: Optional[str] = None
    scheme: Optional[str] = None


class PolicyCreate(PolicyBase):
    pass


class PolicyOut(PolicyBase):
    id: UUID

    class Config:
        orm_mode = True


class ComplaintBase(BaseModel):
    source: str
    received_at: datetime
    description: str
    category: str
    reason: Optional[str] = None
    fca_complaint: bool = False
    fca_rationale: Optional[str] = None
    fos_complaint: bool = False
    fos_reference: Optional[str] = None
    fos_referred_at: Optional[datetime] = None
    vulnerability_flag: bool = False
    vulnerability_notes: Optional[str] = None
    policy_number: Optional[str] = None
    insurer: Optional[str] = None
    broker: Optional[str] = None
    product: Optional[str] = None
    scheme: Optional[str] = None


class ComplaintCreate(ComplaintBase):
    complainant: ComplainantCreate
    policy: PolicyCreate


class ComplaintUpdate(BaseModel):
    source: Optional[str] = None
    received_at: Optional[datetime] = None
    description: Optional[str] = None
    category: Optional[str] = None
    reason: Optional[str] = None
    fca_complaint: Optional[bool] = None
    vulnerability_flag: Optional[bool] = None
    vulnerability_notes: Optional[str] = None
    product: Optional[str] = None
    scheme: Optional[str] = None
    broker: Optional[str] = None
    insurer: Optional[str] = None
    policy_number: Optional[str] = None
    is_escalated: Optional[bool] = None
    complainant: Optional[ComplainantCreate] = None
    policy: Optional[PolicyCreate] = None


class CommunicationBase(BaseModel):
    channel: CommunicationChannel
    direction: CommunicationDirection
    summary: str
    occurred_at: datetime
    is_final_response: bool = False


class CommunicationCreate(CommunicationBase):
    attachments: list[str] | None = None


class AttachmentOut(BaseModel):
    id: UUID
    file_name: str
    content_type: str
    url: str

    class Config:
        orm_mode = True


class CommunicationOut(CommunicationBase):
    id: UUID
    created_at: datetime
    attachments: List[AttachmentOut] = Field(default_factory=list)

    class Config:
        orm_mode = True


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: TaskStatus = TaskStatus.open
    is_checklist: bool = False
    assigned_to_id: Optional[str] = None


class TaskCreate(TaskBase):
    pass


class TaskOut(TaskBase):
    id: UUID
    created_at: datetime

    class Config:
        orm_mode = True


class OutcomeCreate(BaseModel):
    outcome: OutcomeType
    notes: Optional[str] = None


class OutcomeOut(BaseModel):
    id: UUID
    outcome: OutcomeType
    notes: Optional[str]
    recorded_at: datetime

    class Config:
        orm_mode = True


class RedressCreate(BaseModel):
    amount: Optional[float] = None
    payment_type: RedressType
    status: RedressPaymentStatus = RedressPaymentStatus.pending
    notes: Optional[str] = None
    outcome_id: Optional[str] = None
    rationale: Optional[str] = None
    action_description: Optional[str] = None
    action_status: Optional[ActionStatus] = ActionStatus.not_started
    approved: bool = False


class RedressUpdate(BaseModel):
    amount: Optional[float] = None
    status: Optional[RedressPaymentStatus] = None
    notes: Optional[str] = None
    rationale: Optional[str] = None
    action_description: Optional[str] = None
    action_status: Optional[ActionStatus] = None
    approved: Optional[bool] = None


class RedressOut(BaseModel):
    id: UUID
    amount: Optional[float]
    payment_type: RedressType
    status: RedressPaymentStatus
    created_at: datetime
    notes: Optional[str]
    rationale: Optional[str]
    action_description: Optional[str]
    action_status: ActionStatus
    approved: bool

    class Config:
        orm_mode = True


class ReopenRequest(BaseModel):
    reason: Optional[str] = None
    reopened_at: Optional[datetime] = None


class CloseRequest(BaseModel):
    closed_at: Optional[datetime] = None
    comment: Optional[str] = None


class EscalateRequest(BaseModel):
    manager_id: str


class ReferToFosRequest(BaseModel):
    fos_reference: str
    fos_referred_at: Optional[datetime] = None


class ComplaintOut(BaseModel):
    id: UUID
    reference: str
    status: ComplaintStatus
    source: str
    received_at: datetime
    description: str
    category: str
    reason: Optional[str]
    fca_complaint: bool
    fos_complaint: bool
    fos_reference: Optional[str]
    fos_referred_at: Optional[datetime]
    vulnerability_flag: bool
    vulnerability_notes: Optional[str]
    non_reportable: bool
    ack_due_at: datetime
    final_due_at: datetime
    acknowledged_at: Optional[datetime]
    final_response_at: Optional[datetime]
    closed_at: Optional[datetime]
    ack_breached: bool
    final_breached: bool
    assigned_handler_id: Optional[UUID]
    assigned_handler_name: Optional[str]
    product: Optional[str]
    scheme: Optional[str]
    broker: Optional[str]
    insurer: Optional[str]
    policy_number: Optional[str]
    is_escalated: bool
    complainant: ComplainantOut
    policy: PolicyOut
    communications: List[CommunicationOut] = Field(default_factory=list)
    tasks: List[TaskOut] = Field(default_factory=list)
    outcome: Optional[OutcomeOut]
    redress_payments: List[RedressOut] = Field(default_factory=list)

    class Config:
        orm_mode = True


class EventOut(BaseModel):
    id: UUID
    event_type: str
    description: Optional[str]
    created_at: datetime
    created_by_id: Optional[UUID]
    created_by_name: Optional[str]

    class Config:
        orm_mode = True

