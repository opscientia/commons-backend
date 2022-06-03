const sqlite3 = require("sqlite3").verbose();

const { db } = require("../init");

/**
 * Select from users table where column_i=value_i.
 * @returns Row in user table if user exists, null otherwise. Returns first item that matches query.
 */
module.exports.selectUser = (columns, values) => {
  if (columns.length !== values.length) {
    throw new Error("dbWrapper.selectUser: columns.length must equal values.length");
  }
  if (columns.length === 0) {
    throw new Error("dbWrapper.selectUser: columns.length and values.length must be greater than 0");
  }
  const columnsStr = columns.join("=? AND ") + "=?";
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM users WHERE ${columnsStr}`, values, (err, row) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

module.exports.getUserByAddress = async (address) => {
  return await module.exports.selectUser(["address"], [address]);
};

/**
 * Get all rows in users table.
 */
module.exports.getAllUsers = () => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM users`, [], (err, rows) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

/**
 * Select from files table where column_i=value_i.
 * @returns Row in files table if file exists, null otherwise. Returns first item that matches query.
 */
module.exports.selectFiles = (columns, values) => {
  if (columns.length !== values.length) {
    throw new Error("dbWrapper.selectFile: columns.length must equal values.length");
  }
  if (columns.length === 0) {
    throw new Error("dbWrapper.selectFile: columns.length and values.length must be greater than 0");
  }
  const columnsStr = columns.join("=? AND ") + "=?";
  console.log(columnsStr);
  console.log(values);
  // values = values.length === 1 ? values[0] : values;
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM files WHERE ${columnsStr}`, values, (err, row) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

/**
 * Get all files that belong to a user
 */
module.exports.getFilesByUserAddress = async (address) => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM files WHERE address=?`, [address], (err, rows) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

/**
 * Get all rows in files table.
 */
module.exports.getAllFiles = () => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM files`, [], (err, rows) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

/**
 * Run the given SQL command with the given parameters.
 * Helpful for UPDATEs and INSERTs.
 */
module.exports.runSql = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};
