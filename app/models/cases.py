from datetime import date, datetime
from typing import Optional, List
from sqlmodel import Integer, SQLModel, Field, Relationship, true

# --- NEW DEFENDANT TABLE ---


class Defendant(SQLModel, table=True):
    __tablename__ = 'defendants'

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    number: int
    case_profile: Optional[str] = Field(default=None, nullable=True)
    complaint_date: Optional[date] = Field(default=None, nullable=True)
    paragraph_count: Optional[int] = Field(default=None, nullable=True)
    # Automatically sets the time
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Link back to the CaseEntry
    case_id: int = Field(foreign_key="case-entries.id")
    case: "CaseEntry" = Relationship(back_populates="defendants")

    service_status: Optional[str] = Field(default="None")
    settlement_status: Optional[str] = Field(default="None")
    discovery_status: Optional[str] = Field(default="None")
    litigation_status_id: int = Field(default=3)
    settlement_amount: Optional[float] = Field(default=0.0, nullable=true, ge=0)


class Plaintiff(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    number: int
    case_profile: Optional[str] = Field(default=None, nullable=True)
    complaint_date: Optional[date] = Field(default=None, nullable=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Relationship to Case
    case_id: int = Field(foreign_key="case-entries.id")
    case: "CaseEntry" = Relationship(back_populates="plaintiffs")

# --- UPDATED CASE ENTRY TABLE ---


class CaseEntryBase(SQLModel):
    user_initial: str
    state: str
    county: str
    circuit: Optional[str] = Field(default=None, nullable=True)
    division: Optional[str] = Field(default=None, nullable=True)
    envelope_number: int = Field(ge=0)
    filing_fee_amount: float = Field(ge=0)
    plaintiff_entry: str
    # Note: We keep defendant_entry here if it's a general summary,
    # but specific details now live in the Defendant table.
    defendant_entry: str
    case_name: str
    type: str
    client_lead: str
    case_class: str
    date_filed: date
    original_number_of_defendants: int = Field(gt=0)
    current_number_of_defendants: int = Field(gt=0)
    complaint_specific_total: Optional[int] = Field(
        default=None, nullable=True)

    service_status: Optional[str] = Field(default="None")
    settlement: Optional[str] = Field(default="None")
    discovery_ok: Optional[str] = Field(default="No")
    discovery: Optional[str] = Field(default="None")
    case_number: Optional[str] = Field(default="None")
    settled_amount: Optional[float] = Field(default=None, ge=0)
    litigation_status_id: int
    filing_folder_url: str
    
    
class CaseDriver(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)  # e.g., "msj_case_value"
    label: str                                  # e.g., "MSJ Case Value (F)"
    value: float                                # e.g., 16000.0
    category: str                               # e.g., "Case Values" or "Probability"


class CaseEntry(CaseEntryBase, table=True):
    __tablename__ = 'case-entries'
    id: int | None = Field(default=None, primary_key=True)

    # This link allows you to access defendants via case.defendants
    defendants: List[Defendant] = Relationship(back_populates="case")

    # NEW plaintiffs relationship
    plaintiffs: List["Plaintiff"] = Relationship(
        back_populates="case", cascade_delete=True)
