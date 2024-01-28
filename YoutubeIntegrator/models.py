from sqlalchemy import Column, Integer, String, DateTime, BigInteger
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Video(Base):
    __tablename__ = 'video_details'

    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    videoId = Column(String)
    title = Column(String)
    length_seconds = Column(Integer)
    channel_id = Column(String)
    short_description = Column(String)
    view_count = Column(BigInteger) 

    thumbnail_url = Column(String)

    author = Column(String)
    publish_date = Column(DateTime)