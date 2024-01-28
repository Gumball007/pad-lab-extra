from sqlalchemy import Column, Float, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Event(Base):
    __tablename__ = 'events'

    # Primary key
    id = Column(Integer, primary_key=True)

    sport_id = Column(Integer)
    league_id = Column(Integer)
    league_name = Column(String)
    starts = Column(DateTime)
    home = Column(String)
    away = Column(String)
    event_type = Column(String)
    resulting_unit = Column(String)

    money_line_home = Column(Float)
    money_line_draw = Column(Float)
    money_line_away = Column(Float)