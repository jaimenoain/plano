import sys

def main():
    address = "Hotel Paris Opéra Affiliated by Meliá, Boulevard Montmartre, Paris, France"
    name = "Hotel Paris Opéra Affiliated by Meliá"

    if address.startswith(name + ", "):
        address = address[len(name) + 2:]
    elif address.startswith(name + ","):
        address = address[len(name) + 1:].strip()

    print(address)

if __name__ == "__main__":
    main()
