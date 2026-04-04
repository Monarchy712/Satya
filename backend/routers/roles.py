from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import get_current_user
from blockchain import add_to_role, remove_from_role, get_all_role_pools

router = APIRouter(prefix="/api/roles", tags=["Roles"])

class AddRolePayload(BaseModel):
    user_address: str
    role_id: int

class RemoveRolePayload(BaseModel):
    user_address: str

@router.post("/add")
def api_add_role(payload: AddRolePayload, user: dict = Depends(get_current_user)):
    if user["role"] not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        tx = add_to_role(payload.user_address, payload.role_id)
        tx.wait()
        return {"success": True, "message": "Role assigned successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/remove")
def api_remove_role(payload: RemoveRolePayload, user: dict = Depends(get_current_user)):
    if user["role"] not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        tx = remove_from_role(payload.user_address)
        tx.wait()
        return {"success": True, "message": "Role removed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/all")
def api_get_all_roles():
    return get_all_role_pools()
