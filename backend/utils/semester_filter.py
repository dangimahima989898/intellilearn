"""
Utility: automatically filter DB queries by student's course+semester.
Admin sees everything. Student sees only their course+semester.
"""
from models.user import User

def apply_semester_filter(query, model, current_user: User):
    """
    Apply course+semester filter if the user is a student.
    model must have course_id and semester_number columns.
    """
    if current_user.role == "student":
        if current_user.course_id:
            query = query.filter(model.course_id == current_user.course_id)
        if current_user.current_semester:
            query = query.filter(
                (model.semester_number == current_user.current_semester) |
                (model.semester_number == None)   # items with no semester = visible to all
            )
    return query
