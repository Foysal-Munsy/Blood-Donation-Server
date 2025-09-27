# Blood Donation Server

A backend REST API for managing blood donation users, donors, requests, and blogs.  
Built with **Node.js**, **Express**, **MongoDB**, and **Firebase Authentication**.

**API Hosted:** [blood-donation-server](https://blood-donation-server-sigma.vercel.app)  
**Website Using API:** [blood-donation-app](https://blood-donation-app-ff014.web.app/)  
**Client-Side Code:** [Blood Donation Client](https://github.com/Foysal-Munsy/Blood-Donation-Client)

---

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** MongoDB
- **Authentication:** Firebase Admin SDK
- **Middleware:** CORS, JSON parsing
- **Development:** Nodemon

---

## Features & Endpoints

### User Management

- `POST /add-user` → Add a new user **(Public)**
- `GET /get-user` → Get currently logged-in user **(Protected)**
- `PATCH /update-user/:id` → Update user data **(Protected)**
- `GET /get-users` → Get all users (except current admin) **(Protected, Admin only)**
- `PATCH /update-role` → Update user role **(Protected, Admin only)**
- `PATCH /update-status` → Update user status **(Protected, Admin only)**
- `GET /get-user-role` → Get role of logged-in user **(Protected)**
- `GET /get-user-status` → Get status of logged-in user **(Protected)**

### Donor Management

- `POST /add-donor` → Add donor info **(Public)**
- `GET /find-donor?donationId=` → Find donor by donation ID **(Protected)**
- `GET /get-donors` → Get all donors **(Public)**

### Donation Requests

- `POST /create-donation-request` → Create a donation request **(Public)**
- `GET /my-donation-request` → Get logged-in user requests **(Protected)**
- `GET /all-donation-requests` → Get all requests **(Protected, Admin only)**
- `GET /all-donation-requests-public` → Get pending requests **(Public)**
- `PATCH /donation-status` → Update request status **(Protected)**
- `PUT /update-donation-request/:ID` → Update donation request **(Protected)**
- `DELETE /delete-request/:id` → Delete request **(Protected)**

### Blogs

- `POST /add-blog` → Add a blog **(Public)**
- `GET /get-blogs` → Get all blogs **(Protected)**
- `GET /get-blogs-public` → Get published blogs **(Public)**
- `GET /blog-details/:ID` → Get blog by ID **(Protected)**
- `PATCH /update-blog-status` → Update blog status **(Protected, Admin only)**
- `DELETE /delete-blog/:id` → Delete blog **(Protected)**

### Bangladesh Geocode

- `GET /districts` → Get all districts **(Public)**
- `GET /upazilas?district_id=` → Get upazilas (optionally filter by district) **(Public)**

---

## Authentication

- Protected routes require **Firebase JWT token** in request header:

```http
Authorization: Bearer <Firebase-ID-Token>
```
