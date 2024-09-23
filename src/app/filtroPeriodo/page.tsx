/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Grid,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  CircularProgress,
  Box,
  Autocomplete,
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import MyAppBar from '@/components/NavBar';

const classNames = ['6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B'];

const formatDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-');
  return `${day}-${month}-${year}`;
};

// Função para remover acentos e converter para minúsculas
const normalizeString = (str: string) => {
  return str
    ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    : '';
};

// Defina a interface para os dados de ausência
interface Absence {
  date: string;
  className: string;
  studentName: string;
  attendanceValue: string;
}

function AbsenceTable() {
  const [selectedClass, setSelectedClass] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState<string | null>(null); // Valor selecionado
  const [inputValue, setInputValue] = useState(''); // Texto digitado
  const [studentOptions, setStudentOptions] = useState<string[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Função de filtro personalizada
  const filterOptions = (options: string[], { inputValue }: { inputValue: string }) => {
    const normalizedInput = normalizeString(inputValue);
    return options.filter((option) =>
      normalizeString(option).includes(normalizedInput)
    );
  };

  const fetchStudentOptions = async () => {
    try {
      const response = await axios.get('/api/getAlunos', {
        params: {
          className: selectedClass || undefined,
        },
      });
      setStudentOptions(response.data);

      // Debugging: Log the list of students
      console.log('Lista de alunos:', response.data);
    } catch (error) {
      console.error('Error fetching student options:', error);
    }
  };

  useEffect(() => {
    fetchStudentOptions();
  }, [selectedClass]);

  const fetchAbsences = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/attendance', {
        params: {
          action: 'getAbsences',
          className: selectedClass || undefined,
          startDate,
          endDate,
          studentName: inputValue || undefined,
        },
      });
      setAbsences(response.data);
    } catch (error) {
      console.error('Error fetching absences:', error);
      alert('Erro ao buscar ausências.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (new Date(startDate) > new Date(endDate)) {
      alert('A data inicial não pode ser posterior à data final.');
      return;
    }
    if (!selectedClass && !inputValue) {
      alert('Por favor, selecione uma turma ou insira o nome do aluno.');
      return;
    }
    fetchAbsences();
  };

  return (
    <>
      <MyAppBar />
      <Container sx={{ marginTop: '100px' }}>
        <Paper sx={{ padding: '20px', boxShadow: 3, borderRadius: 2 }}>
          <Typography variant="h5" gutterBottom>
            Relatório de Ausências
          </Typography>
          <Grid container spacing={2} alignItems="flex-end">
           
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Data Inicial"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Data Final"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                freeSolo
                options={studentOptions}
                getOptionLabel={(option) => option}
                value={searchTerm}
                onChange={(event, newValue) => {
                  setSearchTerm(newValue);
                }}
                inputValue={inputValue}
                onInputChange={(event, newInputValue) => {
                  setInputValue(newInputValue);
                }}
                filterOptions={filterOptions}
                renderInput={(params) => (
                  <TextField {...params} label="Pesquisar Aluno" variant="outlined" />
                )}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleSearch}
                disabled={!startDate || !endDate || (!selectedClass && !inputValue)}
                size="large"
                sx={{ marginTop: { xs: '10px', md: '0' } }}
              >
                Buscar
              </Button>
            </Grid>
          </Grid>

          {/* Mensagem de Carregamento */}
          {isLoading ? (
            <Box display="flex" justifyContent="center" sx={{ marginTop: '40px' }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Tabela de Ausências */}
              <TableContainer sx={{ marginTop: '20px', maxHeight: 500 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.light' }}>
                        Data
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.light' }}>
                        Turma
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.light' }}>
                        Nome do Aluno
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.light' }}>
                        Presença
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {absences.length > 0 ? (
                      absences.map((absence, index) => (
                        <TableRow
                          key={index}
                          sx={{
                            backgroundColor: index % 2 ? 'action.hover' : 'background.paper',
                          }}
                        >
                          <TableCell>{formatDate(absence.date)}</TableCell>
                          <TableCell>{absence.className}</TableCell>
                          <TableCell>{absence.studentName}</TableCell>
                          <TableCell>
                            {absence.attendanceValue === 'F' ? (
                              <Box display="flex" alignItems="center">
                                <Cancel color="error" sx={{ marginRight: 1 }} />
                                <Typography color="error">Ausente</Typography>
                              </Box>
                            ) : (
                              <Box display="flex" alignItems="center">
                                <CheckCircle color="success" sx={{ marginRight: 1 }} />
                                <Typography color="success.main">Presente</Typography>
                              </Box>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          Nenhuma ausência encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Total de Faltas */}
              <Typography variant="subtitle1" align="right" sx={{ marginTop: '10px' }}>
                Total de faltas no período: <strong>{absences.length}</strong>
              </Typography>
            </>
          )}
        </Paper>
      </Container>
    </>
  );
}

export default AbsenceTable;
