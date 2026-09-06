import sqlite3

conn = sqlite3.connect('backend/sql_app.db')
cur = conn.cursor()
cur.execute("DELETE FROM action_items WHERE title LIKE 'E2E Test%'")
conn.commit()
cur.execute("SELECT count(*) FROM action_items")
print("Clean Actions count:", cur.fetchone()[0])
cur.execute("SELECT count(*) FROM projects")
print("Projects count:", cur.fetchone()[0])
conn.close()
