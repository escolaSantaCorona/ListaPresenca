'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import {
  MenuItem,
  Select,
  TextField,
  FormControl,
  InputLabel,
  Switch,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Container,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from '@mui/material';
import axios from 'axios';
import './globals.css';

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

// Função para formatar a data de 'YYYY-MM-DD' para 'DD-MM-YYYY'
const formatDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-');
  return `${day}-${month}-${year}`;
};

export default function AttendanceForm() {
  // useForm with AttendanceData to type the form values
  const { control, watch, handleSubmit, setValue, reset, getValues } = useForm<AttendanceData>(); // Use AttendanceData type
  const [dates, setDates] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showPresent, setShowPresent] = useState(true);
  const [showAbsent, setShowAbsent] = useState(true);
  const [isDatesLoading, setIsDatesLoading] = useState(false);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  // Static array of class names
  const classNames = ['6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B'];

  const selectedClass = watch('className');
  const selectedDate = watch('date');

  // Fetch dates when className changes
  useEffect(() => {
    if (selectedClass) {
      const fetchDatesForClass = async () => {
        setIsDatesLoading(true); // Inicia o carregamento das datas
        try {
          // Make an API request to fetch available dates for the selected class
          const response = await axios.get('/api/dates', {
            params: { className: selectedClass }, // Pass className as a query parameter
          });
          setDates(response.data); // Populate the dates array
          setValue('date', ''); // Reset date when className changes
        } catch (error) {
          console.error('Error fetching dates:', error);
        } finally {
          setIsDatesLoading(false); // Finaliza o carregamento das datas
        }
      };
      fetchDatesForClass();
    }
  }, [selectedClass, setValue]);

  // Fetch students when date changes
  useEffect(() => {
    if (selectedClass && selectedDate) {
      const fetchStudentsForClassAndDate = async () => {
        setIsStudentsLoading(true); // Inicia o carregamento dos alunos
        try {
          setStudents([]); // Clear students state before fetching new data
          const response = await axios.get('/api/attendance', {
            params: { className: selectedClass, date: selectedDate },
          });
          setStudents(response.data); // Populate students array
          reset({
            className: selectedClass, // Preserve the selected class
            date: selectedDate, // Preserve the selected date
            students: response.data.map((student: Student) => ({
              attendanceValue: student.attendanceValue,
            })), // Update students data
          });
        } catch (error) {
          console.error('Error fetching students:', error);
        } finally {
          setIsStudentsLoading(false); // Finaliza o carregamento dos alunos
        }
      };
      fetchStudentsForClassAndDate();
    }
  }, [selectedClass, selectedDate, reset]);

  const submitAttendanceData = async (data: AttendanceData) => {
    try {
      const payload = {
        className: data.className,
        date: data.date,
        students: data.students.map((student, index) => ({
          studentName: students[index].studentName,
          attendanceValue: student.attendanceValue,
        })),
      };

      const response = await axios.post('/api/attendance', payload);

      console.log('Attendance updated:', response.data);
      // Você pode adicionar uma notificação aqui se quiser
    } catch (error) {
      console.error('Error submitting attendance:', error);
      // Você pode adicionar uma notificação de erro aqui se quiser
    }
  };

  // Filtra os alunos com base no termo de pesquisa e nos filtros de presença
  const filteredStudents = students.filter((student) => {
    const matchesSearchTerm = searchTerm.trim()
      ? normalizeString(student.studentName).includes(normalizeString(searchTerm))
      : true;
    const isPresent = student.attendanceValue === '.';
    const matchesFilter =
      (isPresent && showPresent) || (!isPresent && showAbsent);
    return matchesSearchTerm && matchesFilter;
  });

  return (
    // Substitua o <form> por um <div> já que não estamos mais usando o onSubmit
    <div>
      <Container sx={{ marginTop: '50px' }}>
        <Grid container spacing={3}>
          {/* Dropdowns and Search Input */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ padding: '20px', boxShadow: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Filtros
              </Typography>
              {/* Class Dropdown */}
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

              {/* Date Dropdown */}
              <FormControl fullWidth sx={{ marginTop: 2 }}>
                <InputLabel id="date-label">Data</InputLabel>
                <Controller
                  name="date"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <Select
                      {...field}
                      labelId="date-label"
                      label={isDatesLoading ? "Carregando... aguarde" : "Data"}

                      sx={{ '&:hover': { borderColor: 'primary.main' } }} // Hover effect
                    >
                      {isDatesLoading ? (
                        <MenuItem value="">
                          Carregando... aguarde
                        </MenuItem>
                      ) : (
                        dates.map((date) => (
                          <MenuItem key={date} value={date}>
                            {formatDate(date)} {/* Format the date here */}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  )}
                />
              </FormControl>

              {/* Search Input */}
              <TextField
                fullWidth
                label="Pesquisar Aluno"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ marginTop: 2 }}
              />

              {/* Filtros de Presença */}
              <FormControl component="fieldset" sx={{ marginTop: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Filtrar por Presença
                </Typography>
                <FormGroup row>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showPresent}
                        onChange={(e) => setShowPresent(e.target.checked)}
                        name="showPresent"
                        color="primary"
                      />
                    }
                    label="Presentes"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showAbsent}
                        onChange={(e) => setShowAbsent(e.target.checked)}
                        name="showAbsent"
                        color="primary"
                      />
                    }
                    label="Ausentes"
                  />
                </FormGroup>
              </FormControl>
            </Paper>
          </Grid>

          {/* Student Attendance Table */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ padding: '20px', boxShadow: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Lista de Alunos
              </Typography>
              <TableContainer sx={{ maxHeight: 500 }}>
                <Table stickyHeader aria-label="attendance table">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '16px' }}>
                        Nome do aluno
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 'bold', fontSize: '16px' }}
                      >
                        Frequência
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isStudentsLoading ? (
                      <TableRow>
                        <TableCell colSpan={2} align="center">
                          Carregando... aguarde
                        </TableCell>
                      </TableRow>
                    ) : filteredStudents.length > 0 ? (
                      filteredStudents.map((student, index) => {
                        // Encontrar o índice do aluno original na lista completa de students
                        const originalIndex = students.findIndex(
                          (s) => s.studentName === student.studentName
                        );

                        // Verificar se o aluno existe antes de renderizar a linha
                        if (!student || !student.studentName) {
                          return null; // Não renderiza se o aluno não existir
                        }

                        return (
                          <TableRow
                            key={student.studentName}
                            sx={{
                              '&:hover': {
                                backgroundColor: '#f5f5f5',
                              },
                            }}
                          >
                            <TableCell>{student.studentName}</TableCell>
                            <TableCell align="center">
                              <Controller
                                name={`students.${originalIndex}.attendanceValue`} // Use o índice original do aluno
                                control={control}
                                defaultValue={student.attendanceValue}
                                render={({ field }) => (
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 1,
                                    }}
                                  >
                                    <Switch
                                      checked={field.value === '.'}
                                      onChange={async (e) => {
                                        field.onChange(e.target.checked ? '.' : 'F');
                                        const data = getValues();
                                        await submitAttendanceData(data);
                                      }}
                                      color="primary"
                                      size="small"
                                    />
                                    <Typography variant="body2">
                                      {field.value === '.' ? 'Presente' : 'Ausente'}
                                    </Typography>
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
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </div>
  );
}
