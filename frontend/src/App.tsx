import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, RequireAuth } from "./auth";
import { Layout } from "./components/Layout";
import { Agenda } from "./pages/Agenda";
import { Book } from "./pages/Book";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { MyAppointments } from "./pages/MyAppointments";
import { Register } from "./pages/Register";
import { ServicesAdmin } from "./pages/ServicesAdmin";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route
              path="/reservar"
              element={
                <RequireAuth roles={["client"]}>
                  <Book />
                </RequireAuth>
              }
            />
            <Route
              path="/mis-citas"
              element={
                <RequireAuth roles={["client"]}>
                  <MyAppointments />
                </RequireAuth>
              }
            />
            <Route
              path="/agenda"
              element={
                <RequireAuth roles={["barber", "admin"]}>
                  <Agenda />
                </RequireAuth>
              }
            />
            <Route
              path="/servicios"
              element={
                <RequireAuth roles={["admin"]}>
                  <ServicesAdmin />
                </RequireAuth>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
