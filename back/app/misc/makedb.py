import sqlite3
import csv
con = sqlite3.connect("ufcdle.db")
cur = con.cursor()

cur.execute('''DROP TABLE IF EXISTS fighters; ''') ### delete the current table to avoid the code adding extra rows to the existing db
cur.execute(
'''CREATE TABLE fighters(
id PRIMARY KEY,
fname,   
lname,
nickname,
division,
rank INT(2),
style,
country,
debut
)'''      ) 

with open('fighter_data.csv', 'r') as file:
    reader = csv.reader(file) 
    next(reader) ## to not process the csv header
    for row in reader:
        cur.execute( 
        '''
        INSERT INTO fighters (id, fname, lname, nickname, division, rank, style, country, debut)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8]))

con.commit()
cur.close()
con.close()


