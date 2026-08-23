import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, status

router = APIRouter(prefix="/api/upload", tags=["File Uploads"])

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_file(file: UploadFile = File(...)):
    try:
        # Check file extension
        ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".jpg"
        allowed_extensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf"]
        if ext not in allowed_extensions:
            ext = ".jpg"
            
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
            
        # Return static asset URL
        file_url = f"/uploads/{unique_filename}"
        return {
            "success": True,
            "filename": unique_filename,
            "url": file_url
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(e)}"
        )
