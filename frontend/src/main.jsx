import { BrowserRouter } from "react-router-dom";
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'; // Thêm dòng này cho bootstrap
import './assets/styles/custom.css'; // Thêm dòng này cho custom styles
// import './index.css'
import App from './App.jsx'
import "./chart-config";



createRoot(document.getElementById('root')).render(
<BrowserRouter>
  <App />
</BrowserRouter>,
)
