import requests
from bs4 import BeautifulSoup
import csv
from datetime import datetime
import sqlite3


con = sqlite3.connect("ufcdle.db")
cur = con.cursor()


fighter_data = []
rank_counter = 1  # Counter to auto append rank based on order of fighters in text file.
csv_file = 'fighter_data.csv'
div_counter = 0
divisions = ["Flyweight", "Bantamweight", "Featherweight", "Lightweight", "Welterweight", "Middleweight", "Light Heavyweight", "Heavyweight", "Women's Strawweight", "Women's Flyweight", "Women's Bantamweight"]

# Converts date format so its more in a more readable format.
# First time using datetime... seems good but I think theres a better way I can do this without dependency??
def convert_date(date_str):
    try:
        date_obj = datetime.strptime(date_str, '%b. %d, %Y')
        return date_obj.strftime('%Y-%m-%d')
    except ValueError:
        return None

# Added an id counter here instead of db because I didn't think to do it earlier.
id_counter = 1

def store_fighter_data(links):
    global id_counter, rank_counter, div_counter
    for link in links:
        response = requests.get(f'https://www.ufc.com{link}')
        if response.status_code == 200:
            fname = {}
            
            # Assign the current id and increment it.
            fname['id'] = id_counter
            id_counter += 1

            soup = BeautifulSoup(response.text, 'html.parser')

            # Get Name.
            scrape_name = soup.find("h1", class_="hero-profile__name")
            namesplit = scrape_name.text.split()
            if len(namesplit) > 0:
                fname['fname'] = namesplit[0]

            if len(namesplit) == 1:
                fname['lname'] = ''
            elif len(namesplit) == 2:
                fname['lname'] = namesplit[1]
            elif len(namesplit) > 2:
                fname['lname'] = ' '.join(namesplit[1:])

            # Get Nickname.
            if soup.find("p", class_="hero-profile__nickname"):
                scrape_nickname = soup.find("p", class_="hero-profile__nickname")
                fname['nickname'] = scrape_nickname.text.strip('"')
            else:
                fname['nickname'] = None
            
            # Scrape Division.
            if len(fighter_data) <= 10:
                scrape_division = soup.find_all("div", class_="hero-profile__division")
                if scrape_division:
                    scrape_division = soup.find("p", class_="hero-profile__division-title")
                    fdivision = scrape_division.text.strip(' Division')
                    fname['division'] = fdivision
            else:
                fname['division'] = divisions[div_counter]
                print(f"{fname['fname']} {fname['lname']} {fname['division']}")

            # Scrape Fighting Style.
            scrape_style = soup.find_all("div", class_="c-bio__field c-bio__field--border-bottom-small-screens")
            fighting_style = 'MMA'  # Default value if not found -> Reminder to mention this in game rules?
            for elem in scrape_style:
                label = elem.find("div", class_="c-bio__label")
                value = elem.find("div", class_="c-bio__text")
                if label and "Fighting style" in label.text:
                    fighting_style = value.text.strip()
                    break
            fname['style'] = fighting_style

            # Scrape Country.
            scrape_country = soup.find_all("div", class_= "c-bio__field c-bio__field--border-bottom-small-screens")
            hometown = 'Unknown' 
            for elem in scrape_country:
                if elem.find("div", class_= "c-bio__label").text == 'Hometown':
                    hometown = elem.text.strip()
                    break

            if ',' in hometown:
                fname['country'] = hometown.strip('"').split(',')[-1].strip()
            else:
                fname['country'] = hometown.split('\n')[-1].strip()

            # Scrape Rank.
            if len(fighter_data) <= 10:
                fname['rank'] = 0  
            else:
                fname['rank'] = rank_counter
                rank_counter += 1
                if rank_counter > 15:
                    rank_counter = 1
                    div_counter += 1

            # Scrape debut.
            scrape_debut = soup.find_all("div", class_="c-bio__field")
            debut = 'Unknown'
            for elem in scrape_debut:
                if 'Octagon' in elem.text:
                    debut = elem.text
                    break
            fname['debut'] = convert_date(debut.strip().split('\n')[-1])

            fighter_data.append(fname)
    
    return fighter_data  


# Function to write fighter data to CSV.
def write_to_csv(fighter_list):
    with open(csv_file, mode='w', newline='') as file:
        # Added 'id' to the list of fieldnames...
        writer = csv.DictWriter(file, fieldnames=['id', 'fname', 'lname', 'nickname', 'division', 'rank', 'style', 'country', 'debut'])
        writer.writeheader()
        for fighter in fighter_list:
            writer.writerow(fighter)


def get_link():
    response = requests.get('https://www.ufc.com/rankings')
    
    if response.status_code == 200:
        soup = BeautifulSoup(response.text, 'html.parser')
        fighter_list = []
        champ_list = []

        # Scrape champs.
        scrape_champs = soup.find_all("div", class_="info")
        for champ in scrape_champs:
            try:
                href = champ.a['href']
                if href not in champ_list:
                    champ_list.append(href)
                    print(href)
            except (AttributeError, TypeError):
                continue 

        # Scrape ranked fighters.
        scrape_fighters = soup.find_all("td", class_="views-field views-field-title") 
        skip15 = 15

        for index, fighter in enumerate(scrape_fighters):
            print(index, fighter.a['href'])
            # Skip the first 15 fighters if intended, skipping logic is dependant on UFC site. If site changes structurally this will need reworking.
            if skip15 > 0:
                skip15 -= 1
                continue
            
            # Skip indices from 141 to 156.
            if 135 <= index <= 149:
                continue
            
            try:
                href = fighter.a['href']
                if href not in champ_list:
                    fighter_list.append(href)
                    print(href)
            except (AttributeError, TypeError):
                continue
            
        fighter_list = champ_list + fighter_list

    return fighter_list
    

write_to_csv(store_fighter_data(get_link()))

def make_db():
    cur.execute('''DROP TABLE IF EXISTS fighters; ''') ### Deletes the current table to avoid the code adding extra rows to the existing db.
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
        next(reader) ## As to skip the CSV header.
        for row in reader:
            cur.execute( 
            '''
            INSERT INTO fighters (id, fname, lname, nickname, division, rank, style, country, debut)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8]))

    con.commit()
    cur.close()
    con.close()
make_db()

def update_database():
     write_to_csv(store_fighter_data)