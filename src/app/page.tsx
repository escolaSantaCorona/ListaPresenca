'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { MenuItem, Select, TextField, FormControl, InputLabel, Switch, Button, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Container, Box } from '@mui/material';
import axios from 'axios';
import "./globals.css"

// Define types for Students
interface Student {
  studentName: string;
  attendanceValue: string;
}

// Define the interface for AttendanceData
export interface AttendanceData {
  className: string;
  date: string;
  students: Student[];
}

// Função para remover acentos e lidar com letras maiúsculas/minúsculas
const normalizeString = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};


export default function AttendanceForm() {

  // Function to format date from 'YYYY-MM-DD' to 'DD-MM-YYYY'
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  };
  // useForm with AttendanceData to type the form values
  const { control, watch, handleSubmit, setValue, reset } = useForm<AttendanceData>();  // Use AttendanceData type
  const [dates, setDates] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  // Static array of class names
  const classNames = ["6A", "6B", "7A", "7B", "8A", "8B", "9A", "9B"];

  const selectedClass = watch("className");
  const selectedDate = watch("date");

  // Fetch dates when className changes
  useEffect(() => {
    if (selectedClass) {
      const fetchDatesForClass = async () => {
        try {
          // Make an API request to fetch available dates for the selected class
          const response = await axios.get('/api/dates', {
            params: { className: selectedClass }, // Pass className as a query parameter
          });
          setDates(response.data);  // Populate the dates array
          setValue("date", "");  // Reset date when className changes
        } catch (error) {
          console.error('Error fetching dates:', error);
        }
      };
      fetchDatesForClass();
    }
  }, [selectedClass, setValue]);

  // Fetch students when date changes
  // Fetch students when date changes
  useEffect(() => {
    if (selectedClass && selectedDate) {
      const fetchStudentsForClassAndDate = async () => {
        try {
          setStudents([]);  // Clear students state before fetching new data
          const response = await axios.get('/api/attendance', {
            params: { className: selectedClass, date: selectedDate },
          });
          setStudents(response.data);  // Populate students array
          reset({
            className: selectedClass,  // Preserve the selected class
            date: selectedDate,        // Preserve the selected date
            students: response.data.map((student: Student) => ({ attendanceValue: student.attendanceValue }))  // Update students data
          });
        } catch (error) {
          console.error('Error fetching students:', error);
        }
      };
      fetchStudentsForClassAndDate();
    }
  }, [selectedClass, selectedDate, reset]);



  const onSubmit: SubmitHandler<AttendanceData> = async (data) => {
    try {
      const payload = {
        className: data.className,
        date: data.date,
        students: data.students.map((student, index) => ({
          studentName: students[index].studentName,  // Add the studentName
          attendanceValue: student.attendanceValue
        })),
      };

      const response = await axios.post('/api/attendance', payload);

      console.log('Attendance updated:', response.data);
      alert('Presença salva com sucesso')
    } catch (error) {
      console.error('Error submitting attendance:', error);
      alert('Erro ao salvar')
    }
  };

  // Filtra os alunos com base no termo de pesquisa
  // Filtra os alunos com base no termo de pesquisa, mas mostra todos se o campo estiver vazio
  const filteredStudents = searchTerm.trim()
    ? students.filter(student =>
      normalizeString(student.studentName).includes(normalizeString(searchTerm))
    )
    : students;  // Se o searchTerm estiver vazio, mostra todos os alunos


  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Container sx={{ marginTop: '50px' }}>
        <Grid container spacing={1} justifyContent="center">
          {/* Dropdown Container Box */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'white',
              padding: '20px',
              boxShadow: 3,
              borderRadius: 2,
              width: '70%', // Adjust the width for better proportions
              marginBottom: '30px',
            }}
          >
            {/* Class Dropdown */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="class-label">Turma</InputLabel>
                <Controller
                  name="className"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <Select
                      {...field}
                      labelId="class-label"
                      label="Turma"
                      sx={{ '&:hover': { borderColor: 'primary.main' } }} // Hover effect
                    >
                      {classNames.map((className) => (
                        <MenuItem key={className} value={className}>
                          {className}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>

            {/* Date Dropdown */}
            <Grid item xs={12} sx={{ marginTop: '20px' }}> {/* Spacing between dropdowns */}
              <FormControl fullWidth>
                <InputLabel id="date-label">Data</InputLabel>
                <Controller
                  name="date"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <Select
                      {...field}
                      labelId="date-label"
                      label="Data"
                      disabled={!selectedClass}
                      sx={{ '&:hover': { borderColor: 'primary.main' } }} // Hover effect
                    >
                      {dates.map((date) => (
                        <MenuItem key={date} value={date}>
                          {formatDate(date)} {/* Format the date here */}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
            {/* Input de pesquisa */}
            <Grid item xs={12} sx={{ marginTop: '20px' }}>
              <TextField
                fullWidth
                label="Pesquisar Aluno"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Grid>
          </Box>



          {/* Student Attendance Table */}
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center' }}>
            <TableContainer component={Paper} sx={{ width: '50%', boxShadow: 3, borderRadius: 2 }}>
              <Table aria-label="attendance table">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ padding: '10px', fontWeight: 'bold', fontSize: '16px' }}>Nome do aluno</TableCell>
                    <TableCell align="center" sx={{ padding: '10px', fontWeight: 'bold', fontSize: '16px' }}>Frequência</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student, index) => {
                      // Encontrar o índice do aluno original na lista completa de students
                      const originalIndex = students.findIndex(s => s.studentName === student.studentName);

                      // Verificar se o aluno existe antes de renderizar a linha
                      if (!student || !student.studentName) {
                        return null; // Não renderiza se o aluno não existir
                      }

                      return (
                        <TableRow key={student.studentName}>
                          <TableCell>{student.studentName}</TableCell>
                          <TableCell align="center">
                            <Controller
                              name={`students.${originalIndex}.attendanceValue`} // Use o índice original do aluno
                              control={control}
                              defaultValue={student.attendanceValue}
                              render={({ field }) => (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                  <Switch
                                    checked={field.value === "."}
                                    onChange={(e) => field.onChange(e.target.checked ? "." : "F")}
                                    color="primary"
                                    size="small"
                                  />
                                  <span>{field.value === "." ? "Presente" : "Ausente"}</span>
                                </Box>
                              )}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        Nenhum aluno encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          {/* Submit Button */}
          <Grid item xs={12} sx={{ textAlign: 'center' }}>
            <Button type="submit" variant="contained" color="primary" sx={{ width: '50%' }}>
              Salvar Presença
            </Button>
          </Grid>
        </Grid>
      </Container>
    </form>



  );
};
