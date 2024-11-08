/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  MenuItem,
  Select,
  TextField,
  FormControl,
  InputLabel,
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
import { ToggleButton } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

import axios from 'axios';
import './globals.css';
import MyAppBar from '@/components/NavBar';

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

// Função para extrair o nome do mês de uma data no formato 'YYYY-MM-DD'
const getMonthName = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

export default function AttendanceForm() {
  const { control, watch, setValue, reset, getValues } = useForm<AttendanceData>();
  const [dates, setDates] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showPresent, setShowPresent] = useState(true);
  const [showAbsent, setShowAbsent] = useState(true);
  const [isDatesLoading, setIsDatesLoading] = useState(false);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  const [months, setMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const classNames = ['6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B'];
  const selectedClass = watch('className');
  const selectedDate = watch('date');

  // Fetch dates when className changes
  useEffect(() => {
    if (selectedClass) {
      const fetchDatesForClass = async () => {
        setIsDatesLoading(true);
        try {
          const response = await axios.get<string[]>('/api/dates', {
            params: { className: selectedClass },
          });
          setDates(response.data);
          setValue('date', '');

          // Extract unique months from dates
          const uniqueMonths = Array.from(
            new Set(response.data.map((date: string) => getMonthName(date)))
          );
          setMonths(uniqueMonths);
        } catch (error) {
          console.error('Error fetching dates:', error);
        } finally {
          setIsDatesLoading(false);
        }
      };
      fetchDatesForClass();
    }
  }, [selectedClass, setValue]);

  // Fetch students when date changes
  useEffect(() => {
    if (selectedClass && selectedDate) {
      const fetchStudentsForClassAndDate = async () => {
        setIsStudentsLoading(true);
        try {
          setStudents([]);
          const response = await axios.get('/api/attendance', {
            params: { action: 'getAttendance', className: selectedClass, date: selectedDate },
          });
          if (Array.isArray(response.data)) {
            setStudents(response.data);
            reset({
              className: selectedClass,
              date: selectedDate,
              students: response.data.map((student: Student) => ({
                attendanceValue: student.attendanceValue,
              })),
            });
          } else {
            console.error('Invalid data received from API:', response.data);
            alert('Erro ao carregar os dados dos alunos.');
          }
        } catch (error) {
          console.error('Error fetching students:', error);
          alert('Erro ao buscar os alunos.');
        } finally {
          setIsStudentsLoading(false);
        }
      };
      fetchStudentsForClassAndDate();
    }
  }, [selectedClass, selectedDate, reset]);

  const submitAttendanceData = async (data: AttendanceData) => {
    try {
      const payload = {
        action: 'updateAttendance',
        className: data.className,
        date: data.date,
        students: data.students.map((student, index) => ({
          studentName: students[index].studentName,
          attendanceValue: student.attendanceValue,
        })),
      };

      const response = await axios.post('/api/attendance', payload);
      console.log('Attendance updated:', response.data);
    } catch (error) {
      console.error('Error submitting attendance:', error);
    }
  };

  // Filter dates based on selected month
  const filteredDates = selectedMonth
    ? dates.filter((date) => getMonthName(date) === selectedMonth)
    : dates;

  // Filtra os alunos com base no termo de pesquisa e nos filtros de presença
  const filteredStudents = students.filter((student) => {
    const matchesSearchTerm = searchTerm.trim()
      ? normalizeString(student.studentName).includes(normalizeString(searchTerm))
      : true;
    const isPresent = student.attendanceValue === '.';
    const matchesFilter = (isPresent && showPresent) || (!isPresent && showAbsent);
    return matchesSearchTerm && matchesFilter;
  });

  return (
    <>
      <MyAppBar />
      <Box sx={{ marginTop: '100px' }}>
        <Container sx={{ marginTop: '50px' }}>
          <Grid container spacing={3}>
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
                      <Select {...field} labelId="class-label" label="Turma">
                        {classNames.map((className) => (
                          <MenuItem key={className} value={className}>
                            {className}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                </FormControl>

                {/* Month Dropdown */}
                <FormControl fullWidth sx={{ marginTop: 2 }}>
                  <InputLabel id="month-label">Mês</InputLabel>
                  <Select
                    labelId="month-label"
                    label="Mês"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {months.map((month) => (
                      <MenuItem key={month} value={month}>
                        {month}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Date Dropdown */}
                <FormControl fullWidth sx={{ marginTop: 2 }}>
                  <InputLabel id="date-label">Data</InputLabel>
                  <Controller
                    name="date"
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                      <Select {...field} labelId="date-label" label="Data" disabled={!selectedClass || isDatesLoading}>
                        {isDatesLoading ? (
                          <MenuItem value="" disabled>
                            Carregando... aguarde
                          </MenuItem>
                        ) : (
                          filteredDates.map((date) => (
                            <MenuItem key={date} value={date}>
                              {formatDate(date)}
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
                      control={<Checkbox checked={showPresent} onChange={(e) => setShowPresent(e.target.checked)} color="primary" />}
                      label="Presentes"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={showAbsent} onChange={(e) => setShowAbsent(e.target.checked)} color="primary" />}
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
                  Lista de Chamada
                </Typography>
                <TableContainer sx={{ maxHeight: 500 }}>
                  <Table stickyHeader aria-label="attendance table">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '16px' }}>Nome do aluno</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '16px' }}>
                          Frequência
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {isStudentsLoading ? (
                        <TableRow>
                          <TableCell colSpan={2} align="center">Carregando... aguarde</TableCell>
                        </TableRow>
                      ) : filteredStudents.length > 0 ? (
                        filteredStudents.map((student, _index) => {
                          const originalIndex = students.findIndex((s) => s.studentName === student.studentName);
                          if (!student || !student.studentName) return null;

                          return (
                            <TableRow
                              key={student.studentName}
                              sx={{
                                backgroundColor: student.attendanceValue === '.' ? '#e0f7e9' : '#ffebee',
                                '&:hover': { backgroundColor: student.attendanceValue === '.' ? '#d0f0d9' : '#ffdddd' },
                              }}
                            >
                              <TableCell sx={{ color: "black" }}>{student.studentName}</TableCell>
                              <TableCell align="center">
                                <Controller
                                  name={`students.${originalIndex}.attendanceValue`}
                                  control={control}
                                  defaultValue={student.attendanceValue}
                                  render={({ field }) => (
                                    <ToggleButton
                                      value="check"
                                      selected={field.value === '.'}
                                      onChange={async () => {
                                        const newValue = field.value === '.' ? 'F' : '.';
                                        field.onChange(newValue);
                                        const data = getValues();
                                        await submitAttendanceData(data);
                                      }}
                                      sx={{
                                        backgroundColor: field.value === '.' ? 'green' : 'red',
                                        color: 'white',
                                        '&:hover': { backgroundColor: field.value === '.' ? 'darkgreen' : 'darkred' },
                                      }}
                                    >
                                      {field.value === '.' ? (
                                        <Box sx={{ display: "flex", gap: '2px' }}>
                                          <CheckCircleIcon color='success' />
                                          <Typography color='success'>Presente</Typography>
                                        </Box>
                                      ) : (
                                        <Box sx={{ display: "flex", gap: '2px' }}>
                                          <CancelIcon />
                                          <Typography sx={{ color: "white", fontWeight: "bold" }}>Ausente</Typography>
                                        </Box>
                                      )}
                                    </ToggleButton>
                                  )}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={2} align="center">Nenhum aluno encontrado</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </>
  );
}
