from datetime import datetime

def calculate_age(birthdate):
    today = datetime.today()
    birthdate = datetime.strptime(birthdate, "%Y-%m-%d")
    age = today.year - birthdate.year

    if (today.month, today.day) < (birthdate.month, birthdate.day):
        age -= 1

    return age

# 사용자로부터 출생일 입력 받기
birthdate_input = input("birthdate (YYYY-MM-DD): ")
age = calculate_age(birthdate_input)
print("{age}")
