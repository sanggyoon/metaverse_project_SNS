import random

def generate_lotto_numbers():
    numbers = random.sample(range(1, 46), 6)
    numbers.sort()
    return numbers

lotto_numbers = generate_lotto_numbers()
print(lotto_numbers)