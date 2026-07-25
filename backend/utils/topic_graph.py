"""
Topic Dependency Graph for MCA subjects at MLSU.
Defines the relationships between topics to suggest the next logical step in learning.
Used by the backend to validate LLM suggestions or supply fallback recommendations.
"""

TOPIC_GRAPH = {
    "DSA": {
        "Arrays": ["Linked Lists", "Sorting"],
        "Linked Lists": ["Trees", "Searching"],
        "Trees": ["Graphs", "Searching"],
        "Graphs": ["Dynamic Programming", "Backtracking"],
        "Sorting": ["Searching", "Greedy"],
        "Searching": ["Trees", "Sorting"],
        "Dynamic Programming": ["Greedy", "Backtracking"],
        "Greedy": ["Dynamic Programming", "Graphs"],
        "Backtracking": ["Dynamic Programming", "Graphs"],
    },
    "DBMS": {
        "ER Diagrams": ["Relational Model", "Normalization"],
        "Relational Model": ["SQL", "Normalization"],
        "SQL": ["Transactions", "Indexing"],
        "Normalization": ["SQL", "Transactions"],
        "Transactions": ["Indexing", "NoSQL"],
        "Indexing": ["NoSQL", "SQL"],
        "NoSQL": ["SQL", "Transactions"],
    },
    "OS": {
        "Processes": ["Scheduling", "Deadlocks"],
        "Scheduling": ["Deadlocks", "Memory Management"],
        "Deadlocks": ["Memory Management", "File Systems"],
        "Memory Management": ["File Systems", "Virtual Memory"],
        "File Systems": ["Processes", "Memory Management"],
    },
    "CN": {
        "OSI Model": ["TCP/IP", "IP Addressing"],
        "TCP/IP": ["Routing", "TCP"],
        "IP Addressing": ["Routing", "DNS"],
        "Routing": ["DNS", "HTTP"],
        "DNS": ["HTTP", "TCP"],
        "HTTP": ["TCP", "UDP"],
        "TCP": ["UDP", "Routing"],
        "UDP": ["TCP", "HTTP"],
    },
    "JAVA": {
        "OOP": ["Collections", "Exception Handling"],
        "Collections": ["Multithreading", "Streams"],
        "Multithreading": ["Exception Handling", "JDBC"],
        "Exception Handling": ["Collections", "Multithreading"],
        "JDBC": ["Lambda", "Streams"],
        "Lambda": ["Streams", "OOP"],
        "Streams": ["OOP", "Collections"],
    },
    "PYTHON": {
        "Syntax": ["OOP", "List Comprehension"],
        "OOP": ["File I/O", "Flask"],
        "List Comprehension": ["NumPy", "Pandas"],
        "File I/O": ["Flask", "OOP"],
        "NumPy": ["Pandas", "Syntax"],
        "Pandas": ["NumPy", "Flask"],
        "Flask": ["Syntax", "File I/O"],
    }
}

def get_next_suggestion(subject_code: str, current_topic: str) -> str:
    """
    Get a suggested next topic based on the current subject and topic.
    Returns a fallback topic if the specific relation or subject is not found.
    """
    sub_code = subject_code.upper()
    if sub_code not in TOPIC_GRAPH:
        return "General Review"
        
    subject_graph = TOPIC_GRAPH[sub_code]
    
    # Try to find matching topic in the graph (case-insensitive lookup)
    matched_key = None
    for key in subject_graph.keys():
        if key.lower() in current_topic.lower() or current_topic.lower() in key.lower():
            matched_key = key
            break
            
    if matched_key and subject_graph[matched_key]:
        return subject_graph[matched_key][0]  # Suggest the primary child node
        
    # Default fallback: return first topic in graph if current_topic doesn't match
    keys = list(subject_graph.keys())
    return keys[0] if keys else "General Review"
