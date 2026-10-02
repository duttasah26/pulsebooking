import mysql from 'mysql2';

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Flash*26', 
  database: 'room_booking',
});

export default db;
