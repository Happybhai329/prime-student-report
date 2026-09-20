import React, { forwardRef } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Filler
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Filler
);

ChartJS.defaults.font.family = "'Plus Jakarta Sans', 'Poppins', sans-serif";
ChartJS.defaults.color = '#475569';

/**
 * 1. Attendance Doughnut Chart
 */
export const AttendanceChart = forwardRef(({ labels = [], data = [] }, ref) => {
  const chartData = {
    labels: labels.length ? labels : ['Present', 'Absent', 'Other'],
    datasets: [
      {
        data: data.length ? data : [0, 0, 0],
        backgroundColor: ['#16a34a', '#dc2626', '#f59e0b'],
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverOffset: 6
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 18,
          font: { size: 12, weight: '700' }
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.raw} classes`
        }
      }
    }
  };

  return <Doughnut ref={ref} data={chartData} options={options} />;
});

/**
 * 2. Homework Bar Chart
 */
export const HomeworkChart = forwardRef(({ labels = [], data = [] }, ref) => {
  const chartData = {
    labels: labels.length ? labels : ['Completed', 'Pending', 'Other'],
    datasets: [
      {
        label: 'Homework Tasks',
        data: data.length ? data : [0, 0, 0],
        backgroundColor: ['#16a34a', '#f59e0b', '#7c3aed'],
        borderRadius: 8,
        barThickness: 34
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.raw} assignments`
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
        grid: { color: 'rgba(226, 232, 240, 0.8)' }
      }
    }
  };

  return <Bar ref={ref} data={chartData} options={options} />;
});

/**
 * 3. Subject-Wise Performance Bar Chart (Color-coded by Strength/Weakness)
 */
export const SubjectWiseChart = forwardRef(({ subjectWise = [] }, ref) => {
  const labels = subjectWise.map((s) => s.subjectName);
  const percentages = subjectWise.map((s) => s.percentage);

  // Strong (>=80%) green, Average (50-79%) amber, Weak (<50%) crimson
  const colors = percentages.map((pct) => {
    if (pct >= 80) return '#16a34a';
    if (pct < 50) return '#dc2626';
    return '#d97706';
  });

  const chartData = {
    labels: labels.length ? labels : ['No Data'],
    datasets: [
      {
        label: 'Average %',
        data: percentages.length ? percentages : [0],
        backgroundColor: colors,
        borderRadius: 8,
        barThickness: 30
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const item = subjectWise[ctx.dataIndex];
            if (!item) return ` ${ctx.raw}%`;
            return ` ${ctx.raw}% (Avg: ${item.averageObtainedMarks} / ${item.averageMaxMarks}) — Status: ${item.status}`;
          }
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (val) => `${val}%` },
        grid: { color: 'rgba(226, 232, 240, 0.8)' }
      }
    }
  };

  return <Bar ref={ref} data={chartData} options={options} />;
});

/**
 * 4. Performance Trend Over Time (Area Line Chart)
 */
export const PerformanceTrendChart = forwardRef(({ trend = [] }, ref) => {
  const labels = trend.map((t) => t.label);
  const data = trend.map((t) => t.percentage);

  const chartData = {
    labels: labels.length ? labels : ['No Exam History'],
    datasets: [
      {
        label: 'Score %',
        data: data.length ? data : [0],
        borderColor: '#7c3aed',
        backgroundColor: 'rgba(124, 58, 237, 0.08)',
        borderWidth: 2.8,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#7c3aed',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2.5,
        pointRadius: 5.5,
        pointHoverRadius: 8
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const item = trend[ctx.dataIndex];
            if (!item) return ` ${ctx.raw}%`;
            let txt = ` ${ctx.raw}% (${item.marks} / ${item.maxMarks})`;
            if (item.rank) txt += ` • Rank #${item.rank}`;
            return txt;
          }
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (val) => `${val}%` },
        grid: { color: 'rgba(226, 232, 240, 0.8)' }
      }
    }
  };

  return <Line ref={ref} data={chartData} options={options} />;
});
