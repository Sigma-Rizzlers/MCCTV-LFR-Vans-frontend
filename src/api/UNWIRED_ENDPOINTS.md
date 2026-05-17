# Unwired API Endpoints

These service functions are defined in services.js and have
matching backend routes ready in mcctv-lfr-vans-api.
They are not yet called from any component.
Wire them when the corresponding UI feature is built.

| Function                      | Endpoint                                     | Future feature                   |
|-------------------------------|----------------------------------------------|----------------------------------|
| listStops                     | GET /api/v1/van-requests/{id}/stops/         | Route/stops UI on form           |
| addStop                       | POST /api/v1/van-requests/{id}/stops/        | Route/stops UI on form           |
| removeStop                    | DELETE /api/v1/van-requests/{id}/stops/{id}  | Route/stops UI on form           |
| listParticipants              | GET /api/v1/participants/                    | Participant directory UI          |
| getParticipant                | GET /api/v1/participants/{id}/               | Participant directory UI          |
| createParticipant             | POST /api/v1/participants/                   | Participant directory UI          |
| updateParticipant             | PUT /api/v1/participants/{id}/               | Participant directory UI          |
| deleteParticipant             | DELETE /api/v1/participants/{id}/            | Participant directory UI          |
| listVanRequestParticipants    | GET /api/v1/van-requests/{id}/participants/  | Members section on form           |
| addVanRequestParticipant      | POST /api/v1/van-requests/{id}/participants/ | Members section on form           |
| removeVanRequestParticipant   | DELETE .../participants/{pid}/               | Members section on form           |
| getUser                       | GET /api/v1/users/{id}/                      | User detail view in SysManager    |
| updateVanRequest              | PUT /api/v1/van-requests/{id}/               | Full report edit mode             |
