// src/chart-config.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,       // <<<< ADD
  Tooltip,
  Legend,
} from "chart.js";

import zoomPlugin from "chartjs-plugin-zoom";
import ChartDataLabels from "chartjs-plugin-datalabels";

// REGISTER ONE TIME ONLY
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  ArcElement,       // <<<< ADD
  zoomPlugin,
  ChartDataLabels
);
