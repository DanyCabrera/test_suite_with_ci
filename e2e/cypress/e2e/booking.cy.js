function addDays(isoDate, days) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekday(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function nextOpenDay() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  let cursor = addDays(today, 1);
  while (weekday(cursor) === 0) cursor = addDays(cursor, 1);
  return cursor;
}

function api() {
  return Cypress.env("apiUrl");
}

describe("reserva de citas", () => {
  it("registra un cliente, reserva el primer horario y lo cancela", () => {
    const email = `cliente.${Date.now()}@example.com`;

    cy.visit("/registro");
    cy.get('[data-testid="full-name"]').type("Ana López");
    cy.get('[data-testid="email"]').type(email);
    cy.get('[data-testid="phone"]').type("5551234567");
    cy.get('[data-testid="password"]').type("secreto123");
    cy.get('[data-testid="submit-register"]').click();

    cy.url().should("include", "/reservar");
    cy.get('[data-testid^="service-"]').should("have.length.at.least", 1).first().click();
    cy.get('[data-testid^="barber-"]').should("have.length.at.least", 1).first().click();
    cy.get('[data-testid^="slot-"]', { timeout: 15000 }).should("have.length.at.least", 1).first().click();
    cy.get('[data-testid="confirm-booking"]').click();

    cy.url().should("include", "/mis-citas");
    cy.get('[data-testid="appointment-item"]').first().should("contain", "Programada");
    cy.get('[data-testid="cancel-appointment"]').first().click();
    cy.get('[data-testid="appointment-item"]').first().should("contain", "Cancelada");
  });

  it("el barbero ve en su agenda una cita creada por la API", () => {
    const day = nextOpenDay();
    const email = `agenda.${Date.now()}@example.com`;
    const password = "secreto123";

    cy.request("POST", `${api()}/auth/register`, {
      email,
      password,
      full_name: "Cliente Agenda",
      phone: "5551234567",
    }).its("status").should("eq", 201);

    cy.request("POST", `${api()}/auth/login`, { email, password }).then((login) => {
      const token = login.body.access_token;
      cy.request(`${api()}/services`).then((services) => {
        cy.request(`${api()}/barbers`).then((barbers) => {
          const service = services.body[0];
          const barber = barbers.body.find((item) => item.email === Cypress.env("barberEmail"));
          cy.request(
            `${api()}/barbers/${barber.id}/availability?service_id=${service.id}&date=${day}`,
          ).then((availability) => {
            expect(availability.body.slots.length).to.be.greaterThan(0);
            cy.request({
              method: "POST",
              url: `${api()}/appointments`,
              headers: { Authorization: `Bearer ${token}` },
              body: {
                barber_id: barber.id,
                service_id: service.id,
                start_at: availability.body.slots[0],
              },
            }).its("status").should("eq", 201);
          });
        });
      });
    });

    cy.visit("/login");
    cy.get('[data-testid="email"]').type(Cypress.env("barberEmail"));
    cy.get('[data-testid="password"]').type(Cypress.env("barberPassword"), { log: false });
    cy.get('[data-testid="submit-login"]').click();
    cy.url().should("include", "/agenda");
    cy.visit(`/agenda?date=${day}`);
    cy.contains('[data-testid="appointment-item"]', "Cliente Agenda", { timeout: 15000 }).should("be.visible");
  });
});
