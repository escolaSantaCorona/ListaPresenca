/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'
import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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

const weekdays = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

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
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);

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
      let data = response.data;

      console.log('Data received from API:', data);

      if (selectedWeekdays.length > 0) {
        data = data.filter((absence: Absence) => {
          const [year, month, day] = absence.date.split('-').map(Number);
          const date = new Date(Date.UTC(year, month - 1, day));
          const dayOfWeek = date.getUTCDay(); // 0 é Domingo, 1 é Segunda-feira, etc.
          return selectedWeekdays.includes(dayOfWeek);
        });
      }

      setAbsences(data);
    } catch (error) {
      console.error('Error fetching absences:', error);
      alert('A conexão demorando para buscar os dados, tente novamente!');
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

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Relatório de Ausências', 14, 22);
    doc.setFontSize(12);

    // Informações gerais no cabeçalho
    doc.text(`Período: ${formatDate(startDate)} a ${formatDate(endDate)}`, 14, 32);

    // Exibe os dias da semana selecionados, se houver
    if (selectedWeekdays.length > 0) {
      const selectedWeekdaysLabels = selectedWeekdays
        .map((dayValue) => weekdays.find((day) => day.value === dayValue)?.label)
        .filter(Boolean)
        .join(', ');

      doc.text(`Dia(s) da semana selecionado(s): ${selectedWeekdaysLabels}`, 14, 40);
    }

    // Nome do aluno e turma, exibido uma vez
    if (absences.length > 0) {
      doc.text(`Nome do aluno: ${absences[0].studentName}`, 14, 48);
    }

    doc.text(`Total de faltas: ${absences.length}`, 14, 56);

    // Definição das colunas e linhas da tabela
    const tableColumn = ['Data', 'Comparência'];
    const tableRows = absences.map((absence) => [
      formatDate(absence.date),
      absence.attendanceValue === 'F' ? 'Ausente' : 'Presente',
    ]);

    // Renderização da tabela
    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 64,
      styles: {
        fontSize: 10,
        cellPadding: 3,
        halign: 'center',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [22, 160, 133],
        textColor: [255, 255, 255],
        fontSize: 11,
      },
      bodyStyles: {
        fillColor: [245, 245, 245],
        textColor: [0, 0, 0],
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255],
      },
      theme: 'grid',
      margin: { top: 50, left: 14, right: 14 },
      tableWidth: 'auto',
    });

    doc.save('Relatório_de_Ausências.pdf');
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
  {/* Campo de Data Inicial */}
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

  {/* Campo de Data Final */}
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

  {/* Campo de Pesquisa de Aluno */}
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

  {/* Seleção de Dias da Semana */}
  <Grid item xs={12} md={3}>
    <FormControl fullWidth variant="outlined">
      <InputLabel id="weekday-select-label">Dias da Semana</InputLabel>
      <Select
        labelId="weekday-select-label"
        multiple
        value={selectedWeekdays}
        onChange={(e) => setSelectedWeekdays(e.target.value as number[])}
        label="Dias da Semana"
        renderValue={(selected) =>
          (selected as number[])
            .map((value) => weekdays.find((day) => day.value === value)?.label)
            .join(', ')
        }
      >
        {weekdays.map((day) => (
          <MenuItem key={day.value} value={day.value}>
            {day.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  </Grid>

  {/* Botões de Ação e Campo de Turma */}
  <Grid item xs={12} md={12}>
    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ gap: 2 }}>
      <Button
        variant="contained"
        color="primary"
        onClick={handleSearch}
        disabled={!startDate || !endDate || (!selectedClass && !inputValue)}
        size="large"
        sx={{ flex: 1 }}
      >
        Buscar
      </Button>

      <Button
        variant="contained"
        color="secondary"
        onClick={handleExportPDF}
        size="large"
        sx={{ flex: 1 }}
      >
        Exportar para PDF
      </Button>

      {/* Campo de Exibição da Turma */}
      {absences.length > 0 && (
        <TextField
          label="Turma"
          value={absences[0].className}
          disabled
          sx={{ flex: 1 }}
        />
      )}
    </Box>
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
              <TableContainer sx={{ marginTop: '20px', maxHeight: 400, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <Table stickyHeader aria-label="Tabela de Ausências">
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: 'bold',
                          backgroundColor: '#d32f2f',
                          color: 'white',
                          position: 'sticky',
                          top: 0,
                          zIndex: 1,
                          fontSize: '16px',
                          textAlign: 'center',
                        }}
                      >
                        Data
                      </TableCell>

                      <TableCell
                        sx={{
                          fontWeight: 'bold',
                          backgroundColor: 'blue',
                          color: 'white',
                          position: 'sticky',
                          top: 0,
                          zIndex: 1,
                          fontSize: '16px',
                          textAlign: 'center',
                        }}
                      >
                        Status
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {absences.length > 0 ? (
                      absences.map((absence, index) => (
                        <TableRow
                          key={index}
                          sx={{
                            backgroundColor: index % 2 === 0 ? '#fbe9e7' : '#ffebee',
                            '&:hover': {
                              backgroundColor: '#ffcdd2',
                            },
                          }}
                        >
                          <TableCell sx={{ fontSize: '15px', textAlign: 'center' }}>{formatDate(absence.date)}</TableCell>

                          <TableCell sx={{ fontSize: '15px', textAlign: 'center' }}>
                            <Box display="flex" alignItems="center" justifyContent="center">
                              <Cancel color="error" sx={{ marginRight: 1 }} />
                              <Typography color="error" fontWeight="bold">
                                Ausente
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ padding: 3 }}>
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
