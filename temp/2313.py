def get_and_print_number():
    try:
        number = int(input("숫자를 입력하세요: "))  # 사용자로부터 숫자 입력 받기
        print("입력한 숫자는:", number)  # 입력한 숫자 출력
    except ValueError:
        print("유효한 숫자가 아닙니다. 다시 시도하세요.")

get_and_print_number()
