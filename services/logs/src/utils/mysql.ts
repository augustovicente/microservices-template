import 'dotenv/config'
import mysql from 'mysql';
let connection = mysql.createConnection({
    database : process.env.MYSQL_DATABASE,
    host     : 'logs_db',
    password : process.env.MYSQL_PASSWORD,
    user     : process.env.MYSQL_USER,
});

export const create_connection = () => {
    return connection;
};
 