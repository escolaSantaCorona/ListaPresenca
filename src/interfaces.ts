interface Student {
    studentName: string;
    attendanceValue: string;  // "F" for absent, "." for present
  }
  
  export interface AttendanceData {
    className: string;
    date: string;  // Date string in the format "YYYY-MM-DD"
    students: Student[];
  }
  