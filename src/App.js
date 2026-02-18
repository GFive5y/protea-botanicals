import logo from "./logo.svg";
import "./App.css";
import { useEffect } from "react"; // Only if you're using this for testing

function App() {
  useEffect(() => {
    console.log("Protea Botanicals app loaded"); // Optional test log
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Protea Botanicals QR Tracking System - Edit <code>src/App.js</code>{" "}
          and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
