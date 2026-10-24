from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy import create_engine, Column, Integer, String, Text, Float, Boolean, ForeignKey
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from pydantic import BaseModel
from typing import List
import ollama 
import json
import re
from datetime import datetime, timedelta
# ==========================================
# PHẦN 1: CẤU HÌNH DATABASE (PostgreSQL ở cổng 5433)
# ==========================================
import os; SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://admin:secretpassword123@localhost:5433/career_coach")
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ==========================================
# PHẦN 2: THIẾT KẾ DATABASE (Chuẩn theo đề án TQL)
# ==========================================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class InterviewRequest(BaseModel):
    profile_id: str | None = None
    persona: str | None = "tech_lead"
    level: str | None = "mid"
    language: str | None = "vi"
    analysis_context: dict | None = None
    random_nonce: int | None = None

class AnswerSubmitRequest(BaseModel):
    profile_id: int 
    question_text: str
    student_answer: str

class Profile(Base):
    __tablename__ = "profiles" 
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True) 
    password = Column(String)
    skills_json = Column(Text)       
    interests_json = Column(Text)    
    experience_text = Column(Text)   
    free_time_json = Column(Text)    

class RegisterInput(BaseModel):
    name: str
    email: str
    password: str

class LoginInput(BaseModel):
    email: str
    password: str
class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True) 
    description = Column(Text) 
    requirements_json = Column(Text) 

class Analysis(Base):
    __tablename__ = "analyses"
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    job_id = Column(Integer, ForeignKey("jobs.id"))
    total_score = Column(Float)      
    gaps_json = Column(Text)         
    reasons_json = Column(Text)      

class StudyTask(Base):
    __tablename__ = "study_tasks"
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    title = Column(String)           
    duration_minutes = Column(Integer) 
    scheduled_day = Column(String)
    unlock_time = Column(String)    # Thời điểm mở khóa (ISO 8601)
    deadline_time = Column(String)  # Thời điểm hết hạn (ISO 8601)
    status = Column(String, default="locked") # locked, active, expired, completed  

class TaskCompleteInput(BaseModel):
    task_id: int

class StreakAndReport(Base):
    __tablename__ = "streaks_and_reports"
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    
    # 1. Quản lý Mầm cây & XP
    seed_stage = Column(String, default="Hạt giống") 
    current_xp = Column(Integer, default=0)       # Tổng XP hiện tại
    weekly_xp = Column(Integer, default=0)        # XP cày được trong tuần này
    
    # 2. Quản lý Chuỗi ngày (Streak)
    current_streak = Column(Integer, default=0)   # Chuỗi ngày liên tiếp
    last_study_date = Column(String, default="")  # Lưu ngày học cuối cùng (VD: 2026-10-23) để tính mất chuỗi
    last_watered_date = Column(String, default="")
    recovery_mode = Column(Boolean, default=False)
    
    # 3. Báo cáo Giờ học & Lộ trình (Chuyển sang phút cho dễ tính toán độ chính xác)
    total_roadmap_minutes = Column(Integer, default=0)     # Tổng số phút của toàn bộ lộ trình
    completed_roadmap_minutes = Column(Integer, default=0) # Số phút đã hoàn thành
    
    # 4. Chỉ số Kỷ luật (Tính theo số Task)
    planned_tasks_weekly = Column(Integer, default=0)      # Số task đăng ký tuần này
    completed_tasks_weekly = Column(Integer, default=0)    # Số task thực tế làm được tuần này
    discipline_score = Column(Float, default=0.0)

class Feedback(Base):
    __tablename__ = "feedbacks"
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    job_id = Column(Integer, ForeignKey("jobs.id"))
    is_match = Column(Boolean)       

class Interview(Base):
    __tablename__ = "interviews"
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    job_id = Column(Integer, ForeignKey("jobs.id"))
    questions_json = Column(Text)         
    student_answer_text = Column(Text)    
    evaluation_json = Column(Text)        

Base.metadata.create_all(bind=engine)

# ==========================================
# PHẦN 3: PYDANTIC SCHEMAS 
# ==========================================
class JobCreateAI(BaseModel):
    title: str
    description: str

class CVInput(BaseModel):
    name: str
    email: str
    cv_text: str
    free_time_json: str

class StarAnswerInput(BaseModel):
    student_answer: str 

class ScheduleItem(BaseModel):
    id: int
    exactDate: str
    dayOfWeek: str
    timeStart: str
    timeEnd: str

class StudyPlanRequest(BaseModel):
    profile_id: str  # Dùng str để nhận cả CV mẫu (chữ) lẫn CV thật (số)
    role_id: str
    schedules: List[ScheduleItem]
    gaps: List[str]

# ==========================================
# PHẦN 4: CÁC API ENDPOINTS & BẬT CORS
# ==========================================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Hệ thống AI Career Coach - Hoàn thiện chuẩn Đề án TQL (Qwen 3.5:4b)!"}

@app.post("/jobs/extract-advanced/")
def create_job_with_advanced_ai(job: JobCreateAI, db: Session = Depends(get_db)):
    prompt_text = f"""
    Đọc Mô tả công việc (JD) sau và trích xuất các kỹ năng chuyên môn (Hard skills).
    JD này có thể thuộc bất kỳ ngành nghề nào.
    CHỈ trả về mảng JSON theo cấu trúc sau: 
    [{{"skill": "Tên kỹ năng", "evidence": "Trích dẫn bằng chứng từ JD"}}]
    JD: {job.description}
    """
    try:
        response = ollama.chat(
            model='qwen3.5:4b', 
            messages=[
                {'role': 'system', 'content': 'You are a JSON API. Output only valid JSON.'},
                {'role': 'user', 'content': prompt_text}
            ], 
            format='json'
        )
        ai_extracted_skills = response['message']['content']
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi AI: {str(e)}")

    db_job = Job(title=job.title, description=job.description, requirements_json=ai_extracted_skills)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

@app.post("/profiles/extract-cv/")
def create_profile_from_cv(cv_input: CVInput, db: Session = Depends(get_db)):
    
    # Cắt ngắn 1500 ký tự đầu tiên
    cv_text_short = cv_input.cv_text[:1500] 

    # Gộp toàn bộ lệnh vào một khối prompt duy nhất
    prompt_text = f"""Extract candidate info from the CV text below. Output ONLY a valid JSON object without any explanation.
        CV TEXT:
        {cv_text_short}

        REQUIRED JSON FORMAT:
        {{
            "name": "Candidate Name",
            "email": "email@example.com",
            "skills": {{"Python": 4, "Giao tiếp": 5, "Teamwork": 4}}
        }}
    """
    
    ai_data = {} 
    
    try:
        response = ollama.chat(
            model='qwen3.5:4b',
            format='json',
            messages=[
                {'role': 'user', 'content': prompt_text}
            ],
            options={'temperature': 0.1}
        )
        
        content = ""
        if hasattr(response, 'message') and response.message:
            content = getattr(response.message, 'content', '')
        elif isinstance(response, dict):
            content = response.get('message', {}).get('content', '')

        content = content.strip()
        print(f"--- CÂU TRẢ LỜI GỐC CỦA AI ---:\n{content}\n-----------------------------")

        if not content:
            raise ValueError("Ollama/Qwen bị lỗi core, trả về chuỗi rỗng.")

        json_match = re.search(r'(\{[\s\S]*\})', content)
        if json_match:
            cleaned = json_match.group(1)
        else:
            cleaned = content

        ai_data = json.loads(cleaned.strip())
        
    except Exception as e:
        print(f"--- LỖI TRÍCH XUẤT CV BỊ ẨN ---: {str(e)}") 
        ai_data = {
            "name": cv_input.name,
            "email": cv_input.email,
            "skills": {"Kỹ năng tự nhập": 3},
            "interests": [],
            "experience": "Chưa có dữ liệu"
        }

    ai_name = ai_data.get("name", "")
    if not ai_name or ai_name == "Candidate Name":
        ai_name = cv_input.name
        
    ai_email = ai_data.get("email", "") 
    if not ai_email or "@" not in ai_email or ai_email == "email@example.com":
        ai_email = cv_input.email
        
    raw_skills = ai_data.get("skills", {})
    final_skills = {}
    if isinstance(raw_skills, list):
        for s in raw_skills:
            final_skills[str(s)] = 4
    elif isinstance(raw_skills, dict):
        final_skills = raw_skills

    existing_profile = db.query(Profile).filter(Profile.email == ai_email).first()

    if existing_profile:
        existing_profile.name = ai_name
        existing_profile.skills_json = json.dumps(final_skills, ensure_ascii=False)
        existing_profile.interests_json = json.dumps(ai_data.get("interests", []), ensure_ascii=False)
        existing_profile.experience_text = ai_data.get("experience", "")
        db.commit()
        db.refresh(existing_profile)
        db_profile = existing_profile
    else:
        db_profile = Profile(
            name=ai_name, 
            email=ai_email,
            skills_json=json.dumps(final_skills, ensure_ascii=False),
            interests_json=json.dumps(ai_data.get("interests", []), ensure_ascii=False),
            experience_text=ai_data.get("experience", ""), 
            free_time_json=cv_input.free_time_json
        )
        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)

    return db_profile

@app.post("/analyses/match/{profile_id}/{role_id}")
async def analyze_skill_match(profile_id: str, role_id: str, request: Request, db: Session = Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        body = {}

    is_sample_mode = not str(profile_id).isdigit()

    req_skills = body.get("skills")
    req_interests = body.get("interests")
    req_exp = body.get("experience")

    raw_skills = req_skills if req_skills else {}
    raw_interests = req_interests if req_interests else []
    exp_text = req_exp if req_exp is not None else ""

    if not is_sample_mode:
        profile = db.query(Profile).filter(Profile.id == int(profile_id)).first()
        if profile:
            if not req_skills:
                try: raw_skills = json.loads(profile.skills_json) if profile.skills_json else {}
                except: raw_skills = {}
            if not req_interests:
                try: raw_interests = json.loads(profile.interests_json) if profile.interests_json else []
                except: raw_interests = []
            if not req_exp:
                exp_text = profile.experience_text or ""

    sv_skills = {}
    if isinstance(raw_skills, dict):
        for k, v in raw_skills.items():
            try: sv_skills[str(k).strip()] = float(v)
            except: sv_skills[str(k).strip()] = 3.0
    elif isinstance(raw_skills, list):
        for item in raw_skills:
            if isinstance(item, dict):
                name = item.get("name") or item.get("skill") or item.get("title") or item.get("topic")
                level = item.get("level") or item.get("score") or 3.0
                if name: sv_skills[str(name).strip()] = float(level)
            elif isinstance(item, str):
                sv_skills[item.strip()] = 3.0

    sv_interests = raw_interests if isinstance(raw_interests, (list, dict)) else []

    raw_jd_skills = body.get("jd_skills", [])
    jd_text = body.get("jd_text", "").strip()

    # --- BẮT ĐẦU ĐOẠN XỬ LÝ JD TỰ DO MẠNH MẼ HƠN ---
    if (not raw_jd_skills or len(raw_jd_skills) == 0) and jd_text:
        prompt_text = f"""
        Extract professional skills, technical skills, and soft skills from the Job Description below.
        Output ONLY a JSON array of strings. Do NOT output anything else.
        Example: ["Python", "Communication", "Agile"]
        JD: {jd_text}
        """
        try:
            response = ollama.chat(
                model='qwen3.5:4b', 
                messages=[
                    {'role': 'system', 'content': 'You are a strict data extractor. Return only a JSON array.'},
                    {'role': 'user', 'content': prompt_text}
                ],
                options={'temperature': 0.1}
            )
            raw_content = response.get('message', {}).get('content', '').strip()
            
            # CÁCH 1: Dùng Regex tìm mảng JSON (Chống AI trả lời dài dòng)
            match = re.search(r'\[.*?\]', raw_content, re.DOTALL)
            if match:
                try:
                    array_str = match.group(0)
                    extracted_skills = json.loads(array_str)
                    if isinstance(extracted_skills, list):
                        raw_jd_skills = [str(s) for s in extracted_skills if isinstance(s, str)]
                except:
                    pass
            
            # CÁCH 2: Nếu Regex vẫn xịt, bóc tách từng dòng thủ công
            if not raw_jd_skills or len(raw_jd_skills) == 0:
                lines = raw_content.split('\n')
                manual_skills = []
                for line in lines:
                    clean_line = line.strip().replace('"', '').replace(',', '').replace('[', '').replace(']', '')
                    if clean_line and len(clean_line) < 50 and '{' not in clean_line and '}' not in clean_line:
                        manual_skills.append(clean_line)
                raw_jd_skills = manual_skills

        except Exception as e:
            print(f"Lỗi AI trích xuất JD tự do: {e}")
            raw_jd_skills = ["Kỹ năng chuyên môn", "Kỹ năng mềm"] # Fallback để không bị sập

    jd_skills = {}
    if isinstance(raw_jd_skills, list) and len(raw_jd_skills) > 0:
        for skill in raw_jd_skills:
            if skill:
                skill_name = str(skill).strip()
                jd_skills[skill_name] = {"level": 3.0, "weight": 2.0, "category": skill_name.upper()}
    if not jd_skills:
        jd_skills = {"Kỹ năng mẫu": {"level": 3.0, "weight": 2.0, "category": "KỸ NĂNG MẪU"}}

    radar_categories = {}
    for skill, req in jd_skills.items():
        cat = str(req.get("category", skill)).upper()
        if cat not in radar_categories:
            radar_categories[cat] = [0, 0]

    total_weight = 0
    weighted_score_sum = 0
    met_count = 0
    gap_count = 0
    gap_details = []

    for skill, req in jd_skills.items():
        w_i = float(req.get("weight", 1))   
        yc_i = float(req.get("level", 3))   
        cat = str(req.get("category", skill)).upper()
        total_weight += w_i
        
        sv_i = 0
        for k, v in sv_skills.items():
            if k.lower() in str(skill).lower() or str(skill).lower() in k.lower():
                try: sv_i = float(v)
                except: sv_i = 0
                break
                
        ratio = min(sv_i / yc_i, 1.0) if yc_i > 0 else 0
        weighted_score_sum += (w_i * ratio)
        
        if cat in radar_categories:
            radar_categories[cat][0] += ratio * 100
            radar_categories[cat][1] += 100
        
        if sv_i >= yc_i:
            met_count += 1
        else:
            gap_count += 1
            gap_details.append({
                "name": str(skill),
                "category": cat.lower(),
                "is_required": w_i >= 2,
                "status": "Chưa đạt",
                "reason": f"Yêu cầu mức {int(yc_i)}, hồ sơ {'chưa có' if sv_i == 0 else f'chỉ đạt mức {int(sv_i)}'}."
            })

    skill_score = (weighted_score_sum / total_weight) * 100 if total_weight > 0 else 0
    
    radar_data = {}
    for cat, scores in radar_categories.items():
        if scores[1] > 0:
            radar_data[cat] = round(scores[0] / (scores[1]/100))
        else:
            radar_data[cat] = 0

    avg_interest_level = 3.0
    if isinstance(sv_interests, list) and len(sv_interests) > 0:
        scores = []
        for item in sv_interests:
            if isinstance(item, dict):
                val = item.get("score") or item.get("level") or 3.0
                scores.append(float(val))
        if scores:
            avg_interest_level = sum(scores) / len(scores)
    elif isinstance(sv_interests, dict) and len(sv_interests) > 0:
        levels = [float(val) for val in sv_interests.values() if isinstance(val, (int, float))]
        if levels:
            avg_interest_level = sum(levels) / len(levels)
            
    interest_score = max(0.0, min(100.0, ((avg_interest_level - 1.0) / 4.0) * 100.0))

    exp_lower = exp_text.lower()
    type_coeff = 0.8  
    if "trưởng phòng" in exp_lower or "manager" in exp_lower or "senior" in exp_lower:
        type_coeff = 1.5
    elif "chuyên viên" in exp_lower or "chính thức" in exp_lower or "fulltime" in exp_lower:
        type_coeff = 1.2
    elif "thực tập" in exp_lower or "intern" in exp_lower or "parttime" in exp_lower:
        type_coeff = 1.0
    elif "cuộc thi" in exp_lower or "hackathon" in exp_lower or "đồ án" in exp_lower:
        type_coeff = 0.6
    elif "clb" in exp_lower or "câu lạc bộ" in exp_lower:
        type_coeff = 0.4

    relevance = 1.2 if len(exp_text) > 100 else (1.0 if len(exp_text) > 20 else 0.4)
    total_exp_points = relevance * type_coeff * 1.0
    experience_score = min(100.0, (total_exp_points / 1.5) * 100.0)
    if len(exp_text.strip()) == 0:
        experience_score = 0.0

    final_total_score = (0.50 * skill_score) + (0.25 * interest_score) + (0.25 * experience_score)
    
    return {
        "profile_id": profile_id,
        "role_id": role_id,
        "final_total_score": round(final_total_score),
        "skill_score": round(skill_score),
        "interest_score": round(interest_score),
        "experience_score": round(experience_score),
        "met_skills_count": met_count,
        "gap_skills_count": gap_count,
        "ai_reasoning": "Đã hoàn tất phân tích.",
        "radar_data": radar_data,
        "gap_details": gap_details
    }

# ==========================================
# PHẦN 5: API PHỎNG VẤN STAR & TẠO LỘ TRÌNH QWEN
# ==========================================

from datetime import datetime, timedelta
import json
import traceback

from datetime import datetime, timedelta
import json
import traceback

@app.post("/study-plan/generate")
def generate_study_plan(req: StudyPlanRequest, db: Session = Depends(get_db)):
    try:
        is_sample_mode = not str(req.profile_id).isdigit()
        profile = None
        if not is_sample_mode:
            profile = db.query(Profile).filter(Profile.id == int(req.profile_id)).first()
            if not profile:
                raise HTTPException(status_code=404, detail="Không tìm thấy Profile trong Database")

        missing_skills = req.gaps if req.gaps and len(req.gaps) > 0 else ["Kỹ năng chuyên ngành"]
        gaps_count = len(missing_skills)

        # =========================================================
        # BƯỚC 1: AI LÀM GIẢNG VIÊN (Ép buộc tạo đầy đủ bài học)
        # =========================================================
        prompt_text = f"""
        Lên lộ trình học tập cá nhân hóa để khắc phục ĐẦY ĐỦ {gaps_count} kỹ năng bị hổng sau: {", ".join(missing_skills)}.
        
        QUY TẮC BẮT BUỘC:
        1. Sáng tạo TỐI THIỂU {gaps_count} bài học. Mỗi kỹ năng hổng phải có ít nhất 1 bài học chi tiết.
        2. CHỈ trả về mảng JSON, KHÔNG cần xếp ngày tháng (Hệ thống sẽ tự xếp).
        3. Định dạng chuẩn:
        {{
            "tasks": [
                {{"title": "Tên bài học cụ thể (VD: Hiểu về API RESTful)", "duration_minutes": 45}},
                {{"title": "Thực hành viết API bằng FastAPI", "duration_minutes": 60}}
            ]
        }}
        """
        
        max_retries = 3
        ai_tasks = []
        last_error = ""

        for attempt in range(max_retries):
            print(f"--- ĐANG GỌI AI TẠO LỘ TRÌNH (LẦN THỬ {attempt + 1}/{max_retries}) ---")
            try:
                response = ollama.chat(
                    model='qwen3.5:4b', 
                    messages=[
                        {'role': 'system', 'content': 'You are a JSON generator. Output valid JSON only, no markdown.'},
                        {'role': 'user', 'content': prompt_text}
                    ],
                    options={'temperature': 0.6}
                )
                
                raw_content = response.get('message', {}).get('content', '').strip()
                if "```json" in raw_content: raw_content = raw_content.split("```json")[1].split("```")[0].strip()
                elif "```" in raw_content: raw_content = raw_content.split("```")[1].split("```")[0].strip()

                ai_data = json.loads(raw_content)
                ai_tasks = ai_data.get("tasks", [])
                
                # Ép buộc AI tạo đủ hoặc hơn số lượng kỹ năng hổng[cite: 5]
                if len(ai_tasks) >= gaps_count:
                    print(f"AI ĐÃ TẠO THÀNH CÔNG {len(ai_tasks)} BÀI HỌC CHO {gaps_count} KỸ NĂNG!")
                    break
                else:
                    raise ValueError(f"AI chỉ tạo {len(ai_tasks)}/{gaps_count} bài. Bắt buộc tạo lại.")
            except Exception as e:
                last_error = str(e)

        # Lớp phòng ngự tự động bổ sung nếu AI (sau 3 lần) vẫn tạo thiếu[cite: 5]
        if len(ai_tasks) < gaps_count:
            print(f"CẢNH BÁO: Tự động bổ sung {gaps_count - len(ai_tasks)} bài học bù vào!")
            for i in range(len(ai_tasks), gaps_count):
                ai_tasks.append({"title": f"Bổ sung: Học {missing_skills[i % len(missing_skills)]}", "duration_minutes": 45})

        # =========================================================
        # BƯỚC 2: PYTHON BĂM GIỜ VÀ DỰ PHÒNG "CHỜ XẾP LỊCH"
        # =========================================================
        schedules = req.schedules if req.schedules else []
        # Sắp xếp lịch rảnh tăng dần theo thời gian
        schedules.sort(key=lambda x: datetime.strptime(f"{x.exactDate} {x.timeStart}", "%d/%m/%Y %H:%M"))
        
        final_db_tasks = []
        current_schedule_idx = 0
        
        def get_slot_info(idx):
            if idx >= len(schedules): return None, None, 0
            slot = schedules[idx]
            start = datetime.strptime(f"{slot.exactDate} {slot.timeStart}", "%d/%m/%Y %H:%M")
            end = datetime.strptime(f"{slot.exactDate} {slot.timeEnd}", "%d/%m/%Y %H:%M")
            return start, end, int((end - start).total_seconds() / 60)

        current_start, current_end, slot_remaining = get_slot_info(0)

        for task in ai_tasks:
            task_title = task.get("title", "Bài học")
            task_remaining = int(task.get("duration_minutes", 45))
            part = 1
            
            while task_remaining > 0:
                # Nếu đã xài hết slot hiện tại, nhảy sang slot rảnh kế tiếp
                if slot_remaining <= 0 and current_schedule_idx < len(schedules):
                    current_schedule_idx += 1
                    current_start, current_end, slot_remaining = get_slot_info(current_schedule_idx)
                
                # TRƯỜNG HỢP 1: Vẫn còn lịch rảnh -> Băm giờ và xếp vào
                if current_schedule_idx < len(schedules):
                    chunk_duration = min(task_remaining, slot_remaining)
                    chunk_end_time = current_start + timedelta(minutes=chunk_duration)
                    
                    needs_split = (task_remaining > slot_remaining) or (part > 1)
                    final_title = f"{task_title} (Phần {part})" if needs_split else task_title
                    
                    final_db_tasks.append(StudyTask(
                        profile_id=int(req.profile_id) if profile else 0,
                        title=final_title,
                        duration_minutes=chunk_duration,
                        scheduled_day=current_start.strftime("%d/%m/%Y"),
                        unlock_time=current_start.isoformat(),
                        deadline_time=chunk_end_time.isoformat(),
                        status="locked"
                    ))
                    
                    task_remaining -= chunk_duration
                    slot_remaining -= chunk_duration
                    current_start = chunk_end_time
                    part += 1
                
                # TRƯỜNG HỢP 2: User đã xài sạch quỹ thời gian rảnh -> Đưa vào danh sách chờ
                else:
                    needs_split = part > 1
                    final_title = f"{task_title} (Phần {part})" if needs_split else task_title
                    
                    final_db_tasks.append(StudyTask(
                        profile_id=int(req.profile_id) if profile else 0,
                        title=final_title,
                        duration_minutes=task_remaining,
                        scheduled_day="Chờ xếp lịch",
                        unlock_time="",
                        deadline_time="",
                        status="unscheduled" # Trạng thái này Frontend sẽ biết để Ẩn nút học, chờ đăng ký thêm giờ
                    ))
                    task_remaining = 0 # Xong bài này, qua bài AI tiếp theo (đều sẽ bị đẩy vào chờ)

        # Lưu xuống Database
        if profile and final_db_tasks:
            db.query(StudyTask).filter(StudyTask.profile_id == int(req.profile_id)).delete()
            db.add_all(final_db_tasks)
            db.commit()

        # Trả về kết quả
        return {
            "message": "Tạo lộ trình và phân bổ lịch thành công", 
            "tasks": [{"title": t.title, "scheduled_day": t.scheduled_day, "duration_minutes": t.duration_minutes, "status": t.status} for t in final_db_tasks]
        }

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        import traceback
        print("LỖI:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")

# --- BỔ SUNG API LẤY LỘ TRÌNH ĐÃ LƯU CHO TÀI KHOẢN ---
@app.get("/study-plan/tasks/{profile_id}")
def get_saved_study_tasks(profile_id: str, db: Session = Depends(get_db)):
    if not str(profile_id).isdigit():
        return [] # Nếu là tài khoản mẫu thì trả về mảng rỗng
    
    tasks = db.query(StudyTask).filter(StudyTask.profile_id == int(profile_id)).all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "scheduled_day": t.scheduled_day,
            "duration_minutes": t.duration_minutes,
            "status": t.status
        }
        for t in tasks
    ]

# ==========================================
# PHẦN 6: API DỌN DẸP DATABASE (TESTING)
# ==========================================
@app.delete("/system/reset-database/")
def reset_all_database_tables():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return {"message": "Đã reset sạch sẽ toàn bộ Database theo chuẩn đề án TQL!"}

# --- 7. VIẾT 2 API ĐĂNG KÝ VÀ ĐĂNG NHẬP ---
@app.post("/auth/register")
def register_user(data: RegisterInput, db: Session = Depends(get_db)):
    existing = db.query(Profile).filter(Profile.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký!")
    
    new_user = Profile(
        name=data.name, email=data.email, password=data.password, 
        skills_json="{}", interests_json="[]", experience_text="", free_time_json="[]"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # --- TỰ ĐỘNG TẠO BẢN GHI GAMIFICATION (CHẬU CÂY) CHO USER MỚI ---
    new_streak = StreakAndReport(profile_id=new_user.id)
    db.add(new_streak)
    db.commit()
    
    return {"message": "Đăng ký thành công!", "profile_id": new_user.id, "name": new_user.name, "email": new_user.email}

@app.post("/auth/login")
def login_user(data: LoginInput, db: Session = Depends(get_db)):
    user = db.query(Profile).filter(Profile.email == data.email, Profile.password == data.password).first()
    if not user:
        raise HTTPException(status_code=400, detail="Email hoặc mật khẩu không chính xác!")
        
    return {"message": "Đăng nhập thành công!", "profile_id": user.id, "name": user.name, "email": user.email}

# ==========================================
# PHẦN 8: Trạng thái Task & Tiến độ Mầm cây
# ==========================================

@app.post("/study-plan/complete-task")
def complete_study_task(data: TaskCompleteInput, db: Session = Depends(get_db)):
    task = db.query(StudyTask).filter(StudyTask.id == data.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài học")
        
    if task.status == "completed":
        raise HTTPException(status_code=400, detail="Bài học này đã được hoàn thành trước đó!")

    # Chốt chặn thời gian thực: Không cho phép hoàn thành trước giờ mở khóa
    if task.unlock_time:
        try:
            unlock_dt = datetime.fromisoformat(task.unlock_time)
            if datetime.now() < unlock_dt:
                raise HTTPException(status_code=400, detail=f"Chưa đến giờ mở khóa! Bài học mở lúc: {unlock_dt.strftime('%H:%M %d/%m/%Y')}")
        except ValueError:
            pass

    task.status = "completed"
    profile_id = task.profile_id

    record = db.query(StreakAndReport).filter(StreakAndReport.profile_id == profile_id).first()
    if not record:
        record = StreakAndReport(profile_id=profile_id)
        db.add(record)
        db.flush()

    # 1. Cập nhật Chuỗi ngày học (Streak)
    today = datetime.now().date()
    today_str = today.strftime("%Y-%m-%d")
    yesterday_str = (today - timedelta(days=1)).strftime("%Y-%m-%d")

    if record.last_study_date == yesterday_str:
        record.current_streak += 1
    elif record.last_study_date != today_str:
        record.current_streak = 1
    record.last_study_date = today_str

    # 2. Cộng XP
    xp_reward = 50
    record.current_xp += xp_reward
    record.weekly_xp += xp_reward

    # 3. TÍNH TIẾN ĐỘ DỰA TRÊN TỔNG SỐ TASK CỦA LỘ TRÌNH (Từ 0% đến 100%)
    all_tasks = db.query(StudyTask).filter(StudyTask.profile_id == profile_id).all()
    total_tasks = len(all_tasks)
    completed_tasks = sum(1 for t in all_tasks if t.status == "completed")
    
    progress_percent = (completed_tasks / total_tasks) * 100 if total_tasks > 0 else 0

    # Phân chia giai đoạn mầm cây mượt mà theo % hoàn thành
    if progress_percent == 0:
        current_stage = "Hạt giống"
    elif progress_percent < 25:
        current_stage = "Nảy mầm"
    elif progress_percent < 50:
        current_stage = "Phát triển thân"
    elif progress_percent < 75:
        current_stage = "Phân cành"
    elif progress_percent < 100:
        current_stage = "Ra lá"
    else:
        current_stage = "Kết trái" # Đạt 100% khi hoàn thành toàn bộ bài học cuối cùng

    record.seed_stage = current_stage

    # 4. Tính thời gian học (Phút)
    total_mins = sum(t.duration_minutes for t in all_tasks)
    completed_mins = sum(t.duration_minutes for t in all_tasks if t.status == "completed")
    record.total_roadmap_minutes = total_mins
    record.completed_roadmap_minutes = completed_mins

    # 5. Tính Chỉ số Kỷ luật tuần (%)
    record.completed_tasks_weekly = completed_tasks
    if record.planned_tasks_weekly > 0:
        record.discipline_score = round((completed_tasks / record.planned_tasks_weekly) * 100, 1)
    else:
        record.discipline_score = 100.0 if total_tasks > 0 else 0.0

    db.commit()

    return {
        "message": "Hoàn thành bài học thành công!",
        "added_xp": xp_reward,
        "current_xp": record.current_xp,
        "weekly_xp": record.weekly_xp,
        "current_streak": record.current_streak,
        "progress_percent": round(progress_percent, 1),
        "completed_roadmap_minutes": completed_mins,
        "total_roadmap_minutes": total_mins,
        "discipline_score": record.discipline_score,
        "current_seed_stage": current_stage
    }


@app.get("/gamification/{profile_id}")
def get_gamification_data(profile_id: int, db: Session = Depends(get_db)):
    record = db.query(StreakAndReport).filter(StreakAndReport.profile_id == profile_id).first()
    if not record:
        return {"error": "Không tìm thấy dữ liệu"}
        
    today_str = datetime.now().strftime("%Y-%m-%d")
    has_watered = (record.last_watered_date == today_str)

    all_tasks = db.query(StudyTask).filter(StudyTask.profile_id == profile_id).all()
    total_tasks = len(all_tasks)
    completed_tasks = sum(1 for t in all_tasks if t.status == "completed")
    progress_percent = (completed_tasks / total_tasks) * 100 if total_tasks > 0 else 0
    
    total_mins = sum(t.duration_minutes for t in all_tasks)
    completed_mins = sum(t.duration_minutes for t in all_tasks if t.status == "completed")

    # TÍNH TOÁN CÁC THỨ TRONG TUẦN CÓ ĐĂNG KÝ LỊCH HỌC (1: Thứ 2, ..., 7: Chủ Nhật)
    registered_weekdays = []
    for t in all_tasks:
        if t.scheduled_day and t.scheduled_day != "Chờ xếp lịch":
            try:
                task_date = datetime.strptime(t.scheduled_day, "%d/%m/%Y")
                iso_wd = task_date.isoweekday() # 1 là Thứ 2, 7 là Chủ Nhật
                if iso_wd not in registered_weekdays:
                    registered_weekdays.append(iso_wd)
            except ValueError:
                pass

    return {
        "current_streak": record.current_streak,
        "seed_stage": record.seed_stage,
        "current_xp": record.current_xp,
        "weekly_xp": record.weekly_xp,
        "has_watered_today": has_watered,
        "completed_roadmap_minutes": completed_mins,
        "total_roadmap_minutes": total_mins,
        "discipline_score": record.discipline_score,
        "progress_percent": round(progress_percent, 1),
        "completed_tasks": completed_tasks,
        "registered_weekdays": registered_weekdays # Trả về danh sách thứ có lịch học
    }

@app.post("/gamification/water-plant/{profile_id}")
def water_plant(profile_id: int, db: Session = Depends(get_db)):
    record = db.query(StreakAndReport).filter(StreakAndReport.profile_id == profile_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy chậu cây của bạn!")
        
    today_str = datetime.now().strftime("%Y-%m-%d")
    if record.last_watered_date == today_str:
        raise HTTPException(status_code=400, detail="Hôm nay bạn đã tưới nước rồi!")
        
    record.last_watered_date = today_str
    record.current_xp += 25
    record.weekly_xp += 25  # <--- Bổ sung cộng vào XP tích lũy trong tuần
    db.commit()
    
    return {"message": "Tưới nước thành công! +25 XP", "current_xp": record.current_xp, "weekly_xp": record.weekly_xp}

@app.post("/interview/generate")
async def generate_interview_questions(payload: InterviewRequest):
    try:
        persona = payload.persona or "hiring_manager"
        level = payload.level or "mid"
        language = payload.language or "vi"
        context = payload.analysis_context if (payload.analysis_context and isinstance(payload.analysis_context, dict)) else {}
        
        target_role = context.get("target_role", context.get("role_title", context.get("job_title", "Professional")))
        raw_skills = context.get("skills", context.get("matched_skills", []))
        candidate_skills = raw_skills[:5] if isinstance(raw_skills, list) else str(raw_skills)
        raw_gaps = context.get("gaps", context.get("missing_skills", []))
        gaps = raw_gaps[:3] if isinstance(raw_gaps, list) else str(raw_gaps)
        
        lang_text = "Tiếng Việt" if language == "vi" else "English"
        
        # 🌟 CẬP NHẬT PROMPT: Đặt lệnh bắt buộc 3 câu và vẽ sẵn khung 3 Object
        prompt = f"""[HỆ THỐNG]: Bạn là một chuyên gia tuyển dụng AI. BẮT BUỘC phải trả về đúng định dạng JSON thuần túy, không kèm văn bản giải thích.
            YÊU CẦU TỐI THƯỢNG: BẠN PHẢI TẠO RA ĐÚNG 3 CÂU HỎI KHÁC NHAU.

            [THÔNG TIN ĐẦU VÀO]:
            - Vị trí: {target_role}
            - Cấp độ: {level}
            - Kỹ năng: {candidate_skills}
            - Cần cải thiện: {gaps}

            [CẤU TRÚC JSON BẮT BUỘC (Gồm đúng 3 câu)]:
            {{
            "questions": [
                {{
                    "id": 1,
                    "title": "Tiêu đề câu 1",
                    "question": "Nội dung câu 1...",
                    "category": "Chuyên môn",
                    "difficulty": "3/5",
                    "tag": "Cơ bản",
                    "suggested_star": {{"situation": "...", "task": "...", "action": "...", "result": "..."}}
                }},
                {{
                    "id": 2,
                    "title": "Tiêu đề câu 2",
                    "question": "Nội dung câu 2...",
                    "category": "Tình huống",
                    "difficulty": "4/5",
                    "tag": "Quan trọng",
                    "suggested_star": {{"situation": "...", "task": "...", "action": "...", "result": "..."}}
                }},
                {{
                    "id": 3,
                    "title": "Tiêu đề câu 3",
                    "question": "Nội dung câu 3...",
                    "category": "Kỹ năng mềm",
                    "difficulty": "5/5",
                    "tag": "Nâng cao",
                    "suggested_star": {{"situation": "...", "task": "...", "action": "...", "result": "..."}}
                }}
            ]
            }}"""

        print(f"--- Đang gửi yêu cầu tới Qwen 4B cho vị trí: {target_role} ---")
        
        response = ollama.chat(
            model='qwen3.5:4b',
            messages=[
                {'role': 'user', 'content': prompt}
            ],
            options={
                'temperature': 0.4,
                'num_predict': 3000,
            }
        )
        
        content = ""
        if hasattr(response, 'message') and response.message:
            content = getattr(response.message, 'content', '')
        elif isinstance(response, dict):
            content = response.get('message', {}).get('content', '')

        content = content.strip()
        
        print(f"--- KẾT QUẢ AI TẠO CÂU HỎI ---:\n{content[:500]}...\n-----------------------------")

        if not content:
            raise ValueError("Ollama trả về chuỗi nội dung rỗng. AI bị quá tải.")

        import re
        json_match = re.search(r'(\{[\s\S]*\})', content)
        if json_match:
            content = json_match.group(1)
        else:
            raise ValueError(f"Không tìm thấy khối JSON hợp lệ. Nội dung AI sinh ra: {content}")

        content = re.sub(r',\s*([\]}])', r'\1', content)

        import json
        ai_output = json.loads(content)
        return ai_output

    except Exception as e:
        print(f"Lỗi chi tiết từ backend (Phỏng vấn): {str(e)}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Lỗi từ mô hình AI: {str(e)}")



@app.post("/interview/submit-and-evaluate/{question_id}")
async def evaluate_answer(question_id: int, payload: AnswerSubmitRequest, db: Session = Depends(get_db)): # <-- Đã thêm db session ở đây
    try:
        # Prompt ép Qwen 4B chấm điểm và trả về JSON thuần túy (ĐƯỢC GIỮ NGUYÊN TUYỆT ĐỐI)
        prompt = f"""[HỆ THỐNG]: Bạn là một giám khảo phỏng vấn nhân sự khó tính nhưng công tâm. 
            Nhiệm vụ của bạn là chấm điểm câu trả lời của ứng viên dựa trên câu hỏi phỏng vấn.
            BẮT BUỘC phải trả về đúng định dạng JSON thuần túy, không kèm theo văn bản giải thích.

            [THÔNG TIN ĐẦU VÀO]:
            - Câu hỏi phỏng vấn: {payload.question_text}
            - Câu trả lời của ứng viên: {payload.student_answer}

            [CẤU TRÚC JSON BẮT BUỘC]:
            {{
            "evaluation": {{
                "score": <Chấm điểm từ 1.0 đến 10.0 dựa trên độ chi tiết và logic>,
                "feedback": "Nhận xét chi tiết: Điểm tốt là gì? Cần cải thiện điều gì?",
                "improved_answer": "Viết lại một câu trả lời mẫu xuất sắc hơn theo chuẩn STAR"
            }}
        }}"""

        print(f"--- Đang chấm điểm câu hỏi ID: {question_id} ---")
        
        response = ollama.chat(model='qwen3.5:4b', messages=[{'role': 'user', 'content': prompt}], options={'temperature': 0.3, 'num_predict': 3000})
        
        content = getattr(response.message, 'content', '') if hasattr(response, 'message') else response.get('message', {}).get('content', '')
        
        import re
        json_match = re.search(r'(\{[\s\S]*\})', content)
        if not json_match: raise ValueError("Không tìm thấy JSON.")
        
        ai_output = json.loads(re.sub(r',\s*([\]}])', r'\1', json_match.group(1)))
        
        # --- PHẦN MỚI: TÍNH TOÁN VÀ LƯU XP VÀO DATABASE ---
        numeric_score = float(ai_output.get("evaluation", {}).get("score", 0))
        xp_reward = 50 if numeric_score >= 7.0 else 10
        
        # Cập nhật bảng Gamification (Cây)
        streak_record = db.query(StreakAndReport).filter(StreakAndReport.profile_id == payload.profile_id).first()
        if streak_record:
            streak_record.current_xp += xp_reward
            streak_record.weekly_xp += xp_reward
            db.commit()
            
        # (Tùy chọn) Lưu luôn bài làm vào bảng Interview để sau này xem lại
        new_interview = Interview(
            profile_id=payload.profile_id,
            student_answer_text=payload.student_answer,
            evaluation_json=json.dumps(ai_output, ensure_ascii=False)
        )
        db.add(new_interview)
        db.commit()

        # Trả về kết quả kèm số XP đã cộng
        return {
            "evaluation": ai_output.get("evaluation", {}),
            "added_xp": xp_reward,
            "current_xp": streak_record.current_xp if streak_record else 0
        }

    except Exception as e:
        print(f"Lỗi chấm điểm: {str(e)}")
        raise HTTPException(status_code=500, detail="Không thể chấm điểm câu trả lời.")